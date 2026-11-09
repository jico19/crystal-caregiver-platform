import { useMutation } from "@tanstack/react-query";
import { api } from "../../../api/client";
import { Failure } from "../../../components/Failure";

export function DownloadButton({
  path,
  filename,
  label,
}: {
  path: string;
  filename: string;
  label: string;
}) {
  const download = useMutation({
    mutationFn: async () => {
      const response = await api.get<Blob>(path, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const mediaType = String(response.headers["content-type"] ?? "").split(";")[0];
      const extension =
        (
          { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" } as Record<
            string,
            string
          >
        )[mediaType] ?? "";
      link.download = filename.includes(".") ? filename : filename + extension;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  return (
    <div className="my-3">
      <button
        type="button"
        className="button button-outline"
        disabled={download.isPending}
        onClick={() => download.mutate()}
      >
        {download.isPending ? "Downloading…" : label}
      </button>
      <Failure error={download.error} />
    </div>
  );
}
