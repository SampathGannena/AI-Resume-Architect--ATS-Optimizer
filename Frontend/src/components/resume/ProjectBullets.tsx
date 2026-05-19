import { projectBulletLines, type ResumeProject } from "@/lib/resumeTypes";

type Props = {
  project: ResumeProject;
  className?: string;
  itemClassName?: string;
};

export const ProjectBullets = ({ project, className = "mt-1 ml-5 list-disc space-y-0.5", itemClassName = "" }: Props) => {
  const bullets = projectBulletLines(project);
  if (bullets.length === 0) return null;

  return (
    <ul className={className}>
      {bullets.map((bullet, index) => (
        <li key={index} className={itemClassName}>
          {bullet}
        </li>
      ))}
    </ul>
  );
};
