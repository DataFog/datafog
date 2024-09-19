import { WebAppPage } from "@/components/templates/WebAppPage/WebAppPage";
import { Routes } from "@/data/routes";

const Todo = () => {
  return <WebAppPage currentPage={Routes.todo} />;
};

export default Todo;
