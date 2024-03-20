import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      address: string;
      name: string;
      image: string;
      email: string;
      id: string;
    };
  }
}
