import React, { useState } from "react";
import {
  Button,
  Text,
  Flex,
  Container,
  Heading,
  VStack,
  Input,
  Switch,
} from "@chakra-ui/react";
import {
  TbArrowBack,
  TbArrowDown,
  TbArrowUp,
  TbCheck,
  TbChevronDown,
  TbDots,
  TbPencil,
  TbPlus,
  TbTrash,
} from "react-icons/tb";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Todo } from "@prisma/client";
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient } from "@/app/providers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const TodoApp: React.FC = () => {
  const [inputText, setInputText] = useState("");

  const {
    data: todosData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const response = await fetch("/api/todo");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json() as Promise<{
        todos: (Omit<Todo, "updatedAt"> & { updatedAt: string })[];
      }>;
    },
  });

  const createTodoMutation = useMutation({
    mutationFn: async (newTodo: { text: string }) => {
      const response = await fetch("/api/todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTodo),
      });
      if (!response.ok) {
        throw new Error("Failed to create todo");
      }
      return response.json();
    },
    onSuccess: (data) => {
      refetch();
      toast.success("Todo created successfully");
    },
    onError: (error) => {
      toast.error("Error creating todo");
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: async (updatedTodo: {
      id: string;
      text?: string;
      isCompleted?: boolean;
    }) => {
      const response = await fetch("/api/todo", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTodo),
      });
      if (!response.ok) {
        throw new Error("Failed to update todo");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Todo updated successfully");
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error) => {
      toast.error("Error updating todo");
    },
  });

  const handleAddTodo = () => {
    if (inputText.trim() !== "") {
      createTodoMutation.mutate({ text: inputText.trim() });
      setInputText("");
    }
  };

  const handleUpdateTodo = async (
    todo: Pick<Todo, "id" | "text" | "isCompleted">
  ) => {
    return await updateTodoMutation.mutateAsync(todo);
  };

  const todos = todosData?.todos || [];

  const columnHelper = createColumnHelper<{
    id: string;
    text: string;
    updatedAt: string;
    isCompleted: boolean;
  }>();

  const columns = [
    columnHelper.accessor("text", {
      cell: (info) => (
        <Input
          defaultValue={info.getValue()}
          size="sm"
          border="none"
          isDisabled={info.row.original.isCompleted}
          textDecoration={
            info.row.original.isCompleted ? "line-through" : "none"
          }
          onBlur={(e) => {
            if (info.row.original.text !== e.target.value) {
              handleUpdateTodo({
                id: info.row.original.id,
                text: e.target.value,
                isCompleted: info.row.original.isCompleted,
              });
            }
          }}
        />
      ),
      header: "Todo",
    }),
    {
      accessorKey: "updatedAt",
      header: ({ column }: { column: Column<any> }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            size="sm"
          >
            Last update
            {column.getIsSorted() === "desc" && (
              <TbArrowDown className="ml-2 h-4 w-4" />
            )}
            {column.getIsSorted() === "asc" && (
              <TbArrowUp className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }: { row: Row<Todo> }) => (
        <div className="lowercase">
          {new Date(row.getValue("updatedAt")).toLocaleString()}
        </div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<Todo> }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <TbDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {!row.original.isCompleted && (
                <DropdownMenuItem
                  onClick={() =>
                    updateTodoMutation.mutate({
                      id: row.original.id,
                      isCompleted: true,
                    })
                  }
                >
                  <TbCheck className="mr-2 h-4 w-4" />
                  Done
                </DropdownMenuItem>
              )}
              {row.original.isCompleted && (
                <DropdownMenuItem
                  onClick={() =>
                    updateTodoMutation.mutate({
                      id: row.original.id,
                      isCompleted: false,
                    })
                  }
                >
                  <TbArrowBack className="mr-2 h-4 w-4" />
                  Undo
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <TbPencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => openDeleteDialog(row.original)}>
                <TbTrash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: todos,
    columns: columns as ColumnDef<
      Omit<Todo, "updatedAt"> & { updatedAt: string }
    >[],
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableSortingRemoval: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [todoToDelete, setTodoToDelete] = React.useState<Todo | null>(null);

  const openDeleteDialog = (todo: Todo) => {
    setTodoToDelete(todo);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setTodoToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [todoToEdit, setTodoToEdit] = React.useState<Todo | null>(null);

  const openEditDialog = (todo: Todo) => {
    setTodoToEdit(todo);
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setTodoToEdit(null);
    setIsEditDialogOpen(false);
  };

  if (isLoading) return <Text>Loading todos...</Text>;
  if (error) return <Text>An error occurred: {error.message}</Text>;

  return (
    <Container pt={["16px", "40px"]} alignItems="flex-start" minH="100vh">
      <VStack align="flex-start" spacing={4}>
        <Heading size="md">Todo List</Heading>
        <Text className="text-slate-500 text-sm">
          Example of CRUD operations (Create, Read, Update, Delete)
        </Text>
        <Flex gap={2}>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Add a new todo"
            size="sm"
            borderRadius="md"
          />
          <Button
            onClick={handleAddTodo}
            isLoading={createTodoMutation.isPending}
            size="sm"
            leftIcon={<TbPlus />}
            minW="80px"
            isDisabled={inputText.trim() === ""}
            variant="solid"
          >
            Add
          </Button>
        </Flex>

        <div className="flex items-center gap-2 w-full mt-4">
          <Input
            placeholder="Filter list..."
            value={(table.getColumn("text")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("text")?.setFilterValue(event.target.value)
            }
            className="text-sm rounded-md w-full flex-grow"
            size="sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                px="16px"
                rightIcon={<TbChevronDown color="gray" />}
                size="sm"
                minW="100px"
              >
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-md border  w-full">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </VStack>
      <DeleteTodoDialog
        todo={todoToDelete || undefined}
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
      />
      {isEditDialogOpen && (
        <EditTodoDialog
          todo={todoToEdit || undefined}
          isOpen={isEditDialogOpen}
          onClose={closeEditDialog}
          onUpdate={handleUpdateTodo}
          isLoading={updateTodoMutation.isPending}
        />
      )}
    </Container>
  );
};

export default TodoApp;

const DeleteTodoDialog = ({
  todo,
  isOpen,
  onClose,
}: {
  todo: Todo | undefined;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const deleteTodoMutation = useMutation({
    mutationFn: async (todoId: string) => {
      const response = await fetch("/api/todo", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: todoId }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete todo");
      }
      return response.json();
    },
    onSuccess: (_, deletedTodoId) => {
      toast.success("Todo deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error) => {
      toast.error("Error deleting todo");
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
            <br />
            This will permanently delete the todo <strong>{todo?.text}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteTodoMutation.mutate(todo?.id || "")}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const EditTodoDialog = ({
  isLoading,
  isOpen,
  onClose,
  onUpdate,
  todo,
}: {
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (todo: Pick<Todo, "id" | "text" | "isCompleted">) => Promise<void>;
  todo: Todo | undefined;
}) => {
  const [text, setText] = useState(todo?.text || "");
  const [isCompleted, setIsCompleted] = useState(todo?.isCompleted || false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Todo</DialogTitle>
          <DialogDescription>
            Update your item, mark as complete.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="text" className="w-24 text-right">
              Todo
            </Label>
            <div className="flex-1">
              <Input
                id="text"
                defaultValue={todo?.text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Label htmlFor="is-completed" className="w-24 text-right">
              Done
            </Label>
            <Switch
              id="is-completed"
              defaultChecked={todo?.isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              colorScheme="brand"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            isLoading={isLoading}
            colorScheme="brand"
            onClick={async () => {
              await onUpdate({
                id: todo?.id || "",
                text,
                isCompleted: isCompleted,
              });
              onClose();
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
