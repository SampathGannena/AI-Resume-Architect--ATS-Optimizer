import { forwardRef, useCallback, useLayoutEffect, useState } from "react";
import type { ResumeData, TemplateId } from "@/lib/resumeTypes";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { ExecutiveTemplate } from "./templates/ExecutiveTemplate";
import { CreativeTwoColumnTemplate } from "./templates/CreativeTwoColumnTemplate";
import { TechTemplate } from "./templates/TechTemplate";
import { ElegantSerifTemplate } from "./templates/ElegantSerifTemplate";
import { BoldAccentTemplate } from "./templates/BoldAccentTemplate";
import { CompactProTemplate } from "./templates/CompactProTemplate";

interface Props {
  data: ResumeData;
  template: TemplateId;
  fitToContainer?: boolean;
  fillHeight?: boolean;
}

export const ResumePreview = forwardRef<HTMLDivElement, Props>(({ data, template, fitToContainer = false, fillHeight = false }, ref) => {
  const [previewNode, setPreviewNode] = useState<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const templates: Record<TemplateId, ({ data }: { data: ResumeData }) => JSX.Element> = {
    modern: ModernTemplate,
    classic: ClassicTemplate,
    minimal: MinimalTemplate,
    executive: ExecutiveTemplate,
    creative_two_column: CreativeTwoColumnTemplate,
    tech: TechTemplate,
    elegant_serif: ElegantSerifTemplate,
    bold_accent: BoldAccentTemplate,
    compact_pro: CompactProTemplate,
  };

  const T = templates[template] || ModernTemplate;
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    setPreviewNode(node);
    if (typeof ref === "function") {
      ref(node);
      return;
    }
    if (ref) ref.current = node;
  }, [ref]);

  useLayoutEffect(() => {
    if (!fillHeight || !previewNode) return;

    const updatePageCount = () => {
      const pageHeight = 11 * 96;
      const nextPageCount = Math.max(1, Math.ceil(previewNode.scrollHeight / pageHeight));
      setPageCount(nextPageCount);
    };

    updatePageCount();
    const observer = new ResizeObserver(updatePageCount);
    observer.observe(previewNode);
    return () => observer.disconnect();
  }, [fillHeight, previewNode, data, template]);

  const previewStyle = fillHeight
    ? {
        width: "100%",
        minHeight: `${pageCount * 11}in`,
      }
    : {
        width: fitToContainer ? "min(100%, 8.5in)" : "8.5in",
        minHeight: fitToContainer ? undefined : "11in",
        aspectRatio: fitToContainer ? "8.5 / 11" : undefined,
      };

  return (
    <div
      ref={setRefs}
      className={`bg-white text-zinc-900 shadow-2xl mx-auto overflow-visible ${fillHeight ? "resume-preview-paged" : ""}`}
      style={previewStyle}
    >
      <T data={data} />
    </div>
  );
});
ResumePreview.displayName = "ResumePreview";
