import { formatSize } from "../../chat.ts";
import { panels } from "../data.ts";
import type { FileRecord, PanelName, Project } from "../types.ts";
import { Icon, IconButton } from "./Icon.tsx";

export function Panels({
  name,
  files,
  projects,
  onUpload,
  onProjectDialog,
  onSelectProject,
  onDeleteProject,
  onDeleteFile,
  onCard,
}: {
  name: PanelName;
  files: FileRecord[];
  projects: Project[];
  onUpload: () => void;
  onProjectDialog: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onCard: (card: string) => void;
}) {
  const panel = panels[name];
  return (
    <section className="feature-panel">
      <div className="panel-heading">
        <h1>{panel.title}</h1>
        {name === "space" ? (
          <button className="primary-button" onClick={onUpload}>
            添加文件
          </button>
        ) : name === "projects" ? (
          <button className="primary-button" onClick={onProjectDialog}>
            新建项目
          </button>
        ) : null}
      </div>
      <p className="panel-subtitle">
        {panel.description}
        {name === "space" && (
          <>
            <br />
            本地演示仅保存文件记录；文本附件可供模型读取，其他文件暂未解析。
          </>
        )}
      </p>
      {panel.items && (
        <div className="feature-grid">
          {panel.items.map(([title, description, glyph]) => (
            <button
              className="feature-card"
              key={title}
              onClick={() => onCard(title)}
            >
              <Icon name={glyph} />
              <h3>{title}</h3>
              <p>{description}</p>
            </button>
          ))}
        </div>
      )}
      {name === "space" &&
        (files.length ? (
          files.map((file) => (
            <div className="file-row" key={file.id}>
              <Icon name="file" />
              <div className="file-info">
                {file.name}
                <small>
                  {formatSize(file.size)} ·{" "}
                  {new Date(file.date).toLocaleDateString("zh-CN")}
                </small>
              </div>
              <IconButton
                icon="trash"
                label="移除文件记录"
                onClick={() => onDeleteFile(file.id)}
              />
            </div>
          ))
        ) : (
          <div className="empty-panel">
            <Icon name="files" />
            暂时还没有文件
            <br />
            <br />
            添加文件，开始整理你的资料。
          </div>
        ))}
      {name === "projects" &&
        (projects.length ? (
          projects.map((project) => (
            <div className="project-list-row" key={project.id}>
              <button
                className="project-row"
                onClick={() => onSelectProject(project.id)}
              >
                <Icon name="folder" />
                {project.title}
              </button>
              <IconButton
                icon="trash"
                label={`删除项目：${project.title}`}
                onClick={() => onDeleteProject(project.id)}
              />
            </div>
          ))
        ) : (
          <div className="empty-panel">
            <Icon name="folder" />
            创建你的第一个工作项目
          </div>
        ))}
    </section>
  );
}
