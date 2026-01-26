import type { CloseButtonProps } from "react-toastify";

const ToastCloseButton = ({ closeToast }: CloseButtonProps) => (
  <button
    onClick={closeToast}
    className="
      ml-auto
      flex items-center justify-center
      w-6 h-6
      rounded-full
      text-slate-500
      hover:text-slate-900
      hover:bg-slate-200
      transition
      duration-200
      cursor-pointer
    "
    aria-label="Close notification"
  >
    ✕
  </button>
);

export default ToastCloseButton;