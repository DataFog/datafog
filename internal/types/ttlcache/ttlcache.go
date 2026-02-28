package ttlcache

import (
	"container/list"
	"sync"
	"time"
)

const defaultCleanupInterval = 30 * time.Second

// Cache is a concurrency-safe TTL cache with LRU eviction.
// It is intentionally small and purpose-built for in-process request-caching.
type Cache[V any] struct {
	mu              sync.Mutex
	maxSize         int
	ttl             time.Duration
	items           map[string]*list.Element
	order           *list.List // front = most recently used
	clock           func() time.Time
	cleanupInterval time.Duration
	stop            chan struct{}
	stopped         chan struct{}
}

type item[V any] struct {
	key      string
	value    V
	expireAt time.Time
}

func New[V any](maxSize int, ttl time.Duration, options ...Option[V]) *Cache[V] {
	cfg := &Config[V]{
		cleanupInterval: 0,
	}
	for _, option := range options {
		option(cfg)
	}

	if cfg.cleanupInterval < 0 {
		cfg.cleanupInterval = 0
	}
	if cfg.clock == nil {
		cfg.clock = time.Now
	}

	c := &Cache[V]{
		maxSize:         maxSize,
		ttl:             ttl,
		items:           make(map[string]*list.Element),
		order:           list.New(),
		clock:           cfg.clock,
		cleanupInterval: cfg.cleanupInterval,
		stop:            make(chan struct{}),
		stopped:         make(chan struct{}),
	}

	if c.cleanupInterval == 0 {
		c.cleanupInterval = defaultCleanupInterval
	}
	if c.ttl > 0 && c.cleanupInterval > 0 {
		go c.cleanupLoop()
	}
	return c
}

type Config[V any] struct {
	clock           func() time.Time
	cleanupInterval time.Duration
}

type Option[V any] func(*Config[V])

func WithClock[V any](clock func() time.Time) Option[V] {
	return func(cfg *Config[V]) {
		cfg.clock = clock
	}
}

func WithCleanupInterval[V any](interval time.Duration) Option[V] {
	return func(cfg *Config[V]) {
		cfg.cleanupInterval = interval
	}
}

func (c *Cache[V]) Get(key string) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var zero V
	e := c.items[key]
	if e == nil {
		return zero, false
	}
	entry := e.Value.(*item[V])
	if c.isExpired(entry) {
		c.remove(e)
		return zero, false
	}
	c.order.MoveToFront(e)
	return entry.value, true
}

func (c *Cache[V]) Set(key string, value V) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if existing := c.items[key]; existing != nil {
		existing.Value.(*item[V]).value = value
		existing.Value.(*item[V]).expireAt = c.now().Add(c.ttl)
		c.order.MoveToFront(existing)
		return
	}

	entry := &item[V]{
		key:      key,
		value:    value,
		expireAt: c.now().Add(c.ttl),
	}
	e := c.order.PushFront(entry)
	c.items[key] = e
	c.enforceLimitLocked()
}

func (c *Cache[V]) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if e := c.items[key]; e != nil {
		c.remove(e)
	}
}

func (c *Cache[V]) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.evictExpiredLocked()
	return len(c.items)
}

func (c *Cache[V]) Close() {
	select {
	case <-c.stop:
		return
	default:
		close(c.stop)
	}
	<-c.stopped
}

func (c *Cache[V]) enforceLimitLocked() {
	if c.maxSize <= 0 {
		return
	}
	for len(c.items) > c.maxSize {
		back := c.order.Back()
		if back == nil {
			return
		}
		c.remove(back)
	}
}

func (c *Cache[V]) remove(e *list.Element) {
	ent := e.Value.(*item[V])
	c.order.Remove(e)
	delete(c.items, ent.key)
}

func (c *Cache[V]) cleanupLoop() {
	defer close(c.stopped)
	ticker := time.NewTicker(c.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.mu.Lock()
			c.evictExpiredLocked()
			c.mu.Unlock()
		case <-c.stop:
			return
		}
	}
}

func (c *Cache[V]) evictExpiredLocked() {
	for e := c.order.Back(); e != nil; {
		prev := e.Prev()
		if c.isExpired(e.Value.(*item[V])) {
			c.remove(e)
		}
		e = prev
	}
}

func (c *Cache[V]) isExpired(it *item[V]) bool {
	return c.ttl > 0 && !it.expireAt.IsZero() && !it.expireAt.After(c.now())
}

func (c *Cache[V]) now() time.Time {
	return c.clock()
}
