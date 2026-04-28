"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  useEffect(() => {
    import("react-quill-new/dist/quill.snow.css");
  }, []);
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  };
  return (
    <ReactQuill
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder}
      readOnly={disabled}
      theme="snow"
      className="bg-white rounded-xl border border-slate-200"
      style={{ minHeight: 120 }}
    />
  );
}
