type FlashMessageProps = {
  kind: "success" | "error";
  message: string;
};

export function FlashMessage({ kind, message }: FlashMessageProps) {
  const className =
    kind === "success" ? "flash flash-success" : "flash flash-error";

  return <p className={className}>{message}</p>;
}
