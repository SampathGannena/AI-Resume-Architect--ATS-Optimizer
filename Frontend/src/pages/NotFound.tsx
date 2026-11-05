import { useLocation } from "react-router-dom";
import ErrorPage from "./ErrorPage";

const NotFound = () => {
  const location = useLocation();

  console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  return <ErrorPage />;
};

export default NotFound;
