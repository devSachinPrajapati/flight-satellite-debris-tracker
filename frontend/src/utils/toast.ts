import { toast } from "react-toastify";

export const infoToast = (msg: string) =>
  toast(msg);

export const successToast = (msg: string) =>
  toast.success(msg);

export const warningToast = (msg: string) =>
  toast.warning(msg);

export const errorToast = (msg: string) =>
  toast.error(msg);
