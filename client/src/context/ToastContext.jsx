import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", title = "") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type, title }]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((titleOrMessage, message = "") => {
    if (!message) {
      addToast(titleOrMessage, "success", "Action Successful");
    } else {
      addToast(message, "success", titleOrMessage);
    }
  }, [addToast]);

  const showError = useCallback((titleOrMessage, message = "") => {
    if (!message) {
      addToast(titleOrMessage, "error", "Action Failed");
    } else {
      addToast(message, "error", titleOrMessage);
    }
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, showSuccess, showError, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 420,
          width: "calc(100% - 40px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                background: "#ffffff",
                borderRadius: 8,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                borderLeft: isSuccess
                  ? "5px solid #10b981"
                  : isError
                  ? "5px solid #ef4444"
                  : "5px solid #0284c7",
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                borderTop: "1px solid #e2e8f0",
                borderRight: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div style={{ marginTop: 2 }}>
                {isSuccess && <CheckCircle2 size={20} color="#10b981" />}
                {isError && <AlertTriangle size={20} color="#ef4444" />}
                {!isSuccess && !isError && <Info size={20} color="#0284c7" />}
              </div>

              <div style={{ flex: 1 }}>
                {toast.title && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isSuccess ? "#065f46" : isError ? "#991b1b" : "#0c4a6e",
                      marginBottom: 2,
                    }}
                  >
                    {toast.title}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.4 }}>
                  {toast.message}
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 2,
                  marginTop: -2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
