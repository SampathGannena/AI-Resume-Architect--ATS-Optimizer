import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type ApiErrorDetail = {
  kind: "offline" | "server";
  status: number;
  message: string;
};

export const ApiErrorMonitor = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleApiError = (event: Event) => {
      const detail = (event as CustomEvent<ApiErrorDetail>).detail;
      if (!detail || location.pathname === "/error") return;

      navigate("/error", {
        state: {
          kind: detail.kind,
          status: detail.status,
          message: detail.message,
          from: location.pathname,
        },
      });
    };

    const handleOffline = () => {
      if (location.pathname !== "/error") {
        navigate("/error", {
          state: { kind: "offline", from: location.pathname },
        });
      }
    };

    window.addEventListener("careerforge:api-error", handleApiError);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("careerforge:api-error", handleApiError);
      window.removeEventListener("offline", handleOffline);
    };
  }, [location.pathname, navigate]);

  return null;
};
