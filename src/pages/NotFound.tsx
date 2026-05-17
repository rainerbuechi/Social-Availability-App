import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted">
      <div className="no-scrollbar flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>

          <p className="mb-4 text-xl text-muted-foreground">
            Oops! Page not found
          </p>

          <Link to="/feed" className="text-primary underline hover:text-primary/90">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;