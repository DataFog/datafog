import { WebAppPage } from "@/components/templates/WebAppPage/WebAppPage";
import { Routes } from "@/data/routes";
import Scan from "@/components/pages/Scan/Scan";
const ScanPage = () => {
  return <WebAppPage currentPage={Routes.scan} />;
};

export default ScanPage;
