window.__ModuleLoader__.load({
  id: 'dsh-zhiyuan',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/settings/Section.tsx
var import_react4 = require("react");

// src/identity.ts
var PACKAGE_NAME = "dsh-zhiyuan";
var SECTION_ID = "knowledge";
var SECTION_LABEL = "\u77E5\u6E90";

// src/client/bridge.ts
function unwrapCommandResult(exec) {
  const remote = exec;
  if (remote && typeof remote === "object" && "ok" in remote) {
    if (!remote.ok) throw new Error(remote.error?.message || remote.error?.code || "\u547D\u4EE4\u5931\u8D25");
    const result = remote.value?.result;
    if (!result) throw new Error("Host \u672A\u6CE8\u518C /kb\uFF0C\u6216\u5F53\u524D\u6CA1\u6709\u4F1A\u8BDD");
    return result;
  }
  return remote?.result ?? remote ?? {};
}
function listedSession(sessions) {
  try {
    return sessions?.list?.getSnapshot?.()?.current;
  } catch {
    return void 0;
  }
}
function recentWorkspace(workspaces) {
  try {
    const snap = workspaces?.list?.getSnapshot?.();
    return snap?.recentWorkspaceId ?? snap?.items?.[0]?.workspaceId;
  } catch {
    return void 0;
  }
}
async function resolveSession(sessions, workspaces) {
  const current = listedSession(sessions);
  if (current) return current;
  const workspaceId = recentWorkspace(workspaces);
  if (workspaceId && typeof workspaces?.connectWorkspace === "function") {
    const id = await workspaces.connectWorkspace(workspaceId);
    if (id) {
      sessions?.open?.(id);
      return id;
    }
  }
  if (typeof sessions?.create === "function") {
    const id = await sessions.create({});
    if (id) {
      sessions.open?.(id);
      return id;
    }
  }
  throw new Error("\u5F53\u524D\u6CA1\u6709\u4F1A\u8BDD\uFF0C\u65E0\u6CD5\u8054\u7CFB\u4E3B\u8FDB\u7A0B");
}
async function kbCall(remote, sessions, workspaces, payload) {
  const execute = remote?.commands?.execute;
  if (typeof execute !== "function") throw new Error("\u65AD\u8FDE\uFF1A\u6CA1\u6709\u547D\u4EE4\u901A\u9053");
  const sessionId = await resolveSession(sessions, workspaces);
  const line = `/kb call ${JSON.stringify(payload)}`;
  const result = unwrapCommandResult(await execute(sessionId, line, []));
  if (result.kind === "error") throw new Error(result.text || "\u547D\u4EE4\u5931\u8D25");
  return result.text ? JSON.parse(result.text) : null;
}
async function kbStatus(remote, sessions, workspaces) {
  const execute = remote?.commands?.execute;
  if (typeof execute !== "function") throw new Error("\u65AD\u8FDE\uFF1A\u6CA1\u6709\u547D\u4EE4\u901A\u9053");
  const sessionId = await resolveSession(sessions, workspaces);
  const result = unwrapCommandResult(await execute(sessionId, "/kb status", []));
  if (result.kind === "error") throw new Error(result.text || "\u547D\u4EE4\u5931\u8D25");
  return result.text ? JSON.parse(result.text) : { running: false, failed: [] };
}

// src/client/settings/AboutPage.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function AboutPage() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "zy-about", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u8FD9\u662F\u4EC0\u4E48" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u77E5\u6E90\u662F DSH \u7684\u672C\u5730\u4F18\u5148\u77E5\u8BC6\u5E93\u3002\u5B83\u628A\u4F60\u6307\u5B9A\u7684 md/txt \u590D\u5236\u5230\u672C\u673A\u6587\u4EF6\u5939\u91CC\u3002\u63D0\u95EE\u65F6\u4E00\u6B21\u53EA\u67E5\u4E00\u4E2A\u5E93\u3002\u5BFC\u5165\u4E0D\u4F1A\u81EA\u52A8\u5EFA\u5E93\uFF0C\u4E5F\u4E0D\u4F1A\u628A\u6587\u4EF6\u9ED8\u9ED8\u585E\u8FDB\u67D0\u4E2A\u5E93\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u62D4\u7F51\u7EBF\u80FD\u641C\u3002\u5B8C\u6574\u7B54\u6848\u53D6\u51B3\u4E8E\u6709\u6CA1\u6709\u672C\u5730\u6A21\u578B\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "1. \u5EFA\u5E93" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u300C\u77E5\u8BC6\u5E93\u300D\u9875\u5DE6\u4E0B\u89D2\u6216\u7A7A\u6001\u91CC\u7684\u300C\u65B0\u5EFA\u77E5\u8BC6\u5E93\u300D\u3002\u586B id\u3001\u6807\u9898\u3001\u63CF\u8FF0\u3001\u522B\u540D\u3002id \u521B\u5EFA\u540E\u4E0D\u80FD\u6539\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u63CF\u8FF0\u548C\u522B\u540D\u662F\u7ED9\u9009\u5E93\u7528\u7684\uFF1A\u5BF9\u8BDD\u91CC\u6CA1\u8BF4\u67E5\u54EA\u4E2A\u5E93\u65F6\uFF0C\u4F1A\u62FF\u5404\u5E93\u7684\u63CF\u8FF0\u3001\u522B\u540D\u5BF9\u95EE\u9898\u3002\u4E24\u4E2A\u90FD\u50CF\u5C31\u4F1A\u95EE\u4F60\uFF0C\u4E0D\u4F1A\u628A\u6240\u6709\u5E93\u626B\u4E00\u904D\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "zy-demo", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "zy-q", children: "\u5DE5\u4F5C\u5E93 \xB7 \u522B\u540D\uFF1A\u5DE5\u4F5C, \u516C\u53F8, \u5408\u540C\u5E93" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "zy-a", children: "\u63CF\u8FF0\uFF1A\u516C\u53F8\u5408\u540C\u3001\u4F1A\u8BAE\u7EAA\u8981\u3001\u4F9B\u5E94\u5546\u5F80\u6765\u3002\u95EE\u6761\u6B3E\u3001\u7EAA\u8981\u3001\u4EA4\u4ED8\u65F6\u7528\u672C\u5E93\u3002\u4E2A\u4EBA\u8D26\u5355\u3001\u5BB6\u5EAD\u3001\u533B\u7597\u4E0D\u8981\u653E\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "2. \u5BFC\u5165" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "\u5148\u9009\u597D\u5DE6\u4FA7\u7684\u5E93\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "\u70B9\u53F3\u4FA7\u300C\u5BFC\u5165\u300D\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "\u70B9\u300C\u9009\u62E9\u6587\u4EF6\u5939\u300D\u6216\u300C\u9009\u62E9\u6587\u4EF6\u300D\uFF0C\u4F1A\u6253\u5F00\u7CFB\u7EDF\u5BF9\u8BDD\u6846\u3002\u4E5F\u53EF\u4EE5\u7C98\u8D34\u672C\u673A\u5B8C\u6574\u8DEF\u5F84\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        "\u6307\u5B9A\u7C7B\u76EE\uFF0C\u4F8B\u5982 ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "\u5408\u540C/2024" }),
        "\u3002\u6CA1\u6709\u8FD9\u4E2A\u6587\u4EF6\u5939\u4F1A\u521B\u5EFA\uFF1B\u4E0D\u4F1A\u56E0\u6B64\u65B0\u5EFA\u4E00\u4E2A\u77E5\u8BC6\u5E93\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "\u5F00\u59CB\u5BFC\u5165\u3002\u5185\u5BB9\u76F8\u540C\u7684\u6587\u4EF6\u4F1A\u8DF3\u8FC7\uFF0C\u4E0D\u4F1A\u8986\u76D6\u3002\u76EE\u524D\u53EA\u5BFC\u5165 md/txt\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "\u659C\u6760\u547D\u4EE4 ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "/kb ingest" }),
      " \u4E0E\u6309\u94AE\u540C\u4E00\u5957\u5B57\u6BB5\u3002"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "3. \u7528\u81EA\u7136\u8BED\u8A00\u95EE" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u5728\u5BF9\u8BDD\u91CC\u76F4\u63A5\u95EE\uFF0C\u4E0D\u5FC5\u5148\u6253\u5F00\u8BBE\u7F6E\u3002\u70B9\u540D\u5E93\u66F4\u51C6\uFF1B\u6CA1\u70B9\u540D\u5C31\u9760\u63CF\u8FF0\u9009\u5E93\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "zy-demo", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "zy-q", children: "\u53BB\u5E74\u90A3\u4E2A\u4F9B\u5E94\u5546\u5408\u540C\u7684\u8FDD\u7EA6\u6761\u6B3E\u5199\u4E86\u4EC0\u4E48\uFF1F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "zy-a", children: "\u5BF9\u4E0A\u5DE5\u4F5C\u5E93 \u2192 \u547D\u4E2D\u5361\u3002\u70B9\u5361\u53EA\u8BFB\u9884\u89C8\u539F\u6587\uFF0C\u8BE5\u53E5\u9AD8\u4EAE\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "zy-demo", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "zy-q", children: "\u4E0A\u4E2A\u6708\u6C34\u7535\u8D39\u591A\u5C11\uFF1F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "zy-a", children: "\u5BF9\u4E0A\u751F\u6D3B\u5E93\u3002\u5DE5\u4F5C\u5E93\u91CC\u7684\u5408\u540C\u4E0D\u4F1A\u88AB\u6253\u5F00\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "zy-demo", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "zy-q", children: "\u7528 work \u5E93\u67E5 termination \u6761\u6B3E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "zy-a", children: "\u5DF2\u7ECF\u70B9\u540D\u5E93\uFF0C\u4E0D\u518D\u731C\u3002\u53EA\u641C work\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u547D\u4E2D\u5361\u53EF\u53E0\u591A\u6761\u3002\u70B9\u4EFB\u610F\u4E00\u6761\u770B\u539F\u6587\u3002\u7B54\u6848\u91CC\u7684 [1] \u5BF9\u5E94\u5361\u7247\u7F16\u53F7\u3002\u5E93\u91CC\u6CA1\u6709\u7684\u5185\u5BB9\u4E0D\u4F1A\u7F16\u51FA\u6765\u3002" })
  ] });
}

// src/client/settings/Section.tsx
var import_dsh_client_ui_primitives5 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/settings/dialogs.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
function Field(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "zy-field", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { children: props.label }),
    props.children,
    props.help ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "zy-help", children: props.help }) : null
  ] });
}
function Note(props) {
  if (!props.text) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "zy-note", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.IconWarningOutline16, { size: 14 }),
    props.text
  ] });
}
function readForm(event) {
  event.preventDefault();
  return new FormData(event.currentTarget);
}
function Foot(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "zy-footbar", children: props.children });
}
function CreateDialog(props) {
  const form = (0, import_react.useRef)(null);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    import_dsh_client_ui_primitives.Modal,
    {
      open: true,
      onClose: props.onClose,
      title: "\u65B0\u5EFA\u77E5\u8BC6\u5E93",
      className: "zy-modal-form",
      footer: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(Foot, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "zy-btn", type: "button", onClick: props.onClose, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "zy-btn zy-primary", type: "button", disabled: props.busy, onClick: () => form.current?.requestSubmit(), children: "\u521B\u5EFA" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "form",
        {
          ref: form,
          onSubmit: (event) => {
            const data = readForm(event);
            props.onSubmit({
              id: String(data.get("id") ?? ""),
              title: String(data.get("title") ?? ""),
              description: String(data.get("description") ?? ""),
              aliases: String(data.get("aliases") ?? "")
            });
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "id *", help: "\u521B\u5EFA\u540E\u4E0D\u80FD\u6539\u3002\u8DEF\u5F84\u4F1A\u662F bases/<id>/", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { className: "zy-box", name: "id", placeholder: "work", required: true }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "\u6807\u9898 *", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { className: "zy-box", name: "title", placeholder: "\u5DE5\u4F5C\u5E93", required: true }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "\u63CF\u8FF0 *", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("textarea", { className: "zy-area", name: "description", required: true, placeholder: "\u8FD9\u4E2A\u77E5\u8BC6\u5E93\u88C5\u4EC0\u4E48\u3001\u4EC0\u4E48\u95EE\u9898\u8BE5\u67E5\u5B83\u3001\u4EC0\u4E48\u4E0D\u8981\u653E" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "\u522B\u540D", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { className: "zy-box", name: "aliases", placeholder: "\u5DE5\u4F5C, \u516C\u53F8" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Note, { text: props.error })
          ]
        }
      )
    }
  );
}
function EditDialog(props) {
  const form = (0, import_react.useRef)(null);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    import_dsh_client_ui_primitives.Modal,
    {
      open: true,
      onClose: props.onClose,
      title: "\u7F16\u8F91\u77E5\u8BC6\u5E93",
      className: "zy-modal-form",
      footer: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(Foot, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "zy-btn zy-danger", type: "button", onClick: props.onDelete, children: "\u5220\u9664" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "zy-btn", type: "button", onClick: props.onClose, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "zy-btn zy-primary", type: "button", disabled: props.busy, onClick: () => form.current?.requestSubmit(), children: "\u4FDD\u5B58" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "form",
        {
          ref: form,
          onSubmit: (event) => {
            const data = readForm(event);
            props.onSubmit({
              title: String(data.get("title") ?? ""),
              description: String(data.get("description") ?? ""),
              aliases: String(data.get("aliases") ?? "")
            });
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "id", help: "\u521B\u5EFA\u540E\u4E0D\u80FD\u6539", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { className: "zy-box", value: props.base.id, readOnly: true }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "\u6807\u9898 *", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { className: "zy-box", name: "title", defaultValue: props.base.title, required: true }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "\u63CF\u8FF0 *", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("textarea", { className: "zy-area", name: "description", defaultValue: props.base.description, required: true }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Field, { label: "\u522B\u540D", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { className: "zy-box", name: "aliases", defaultValue: props.base.aliases.join(", ") }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Note, { text: props.error })
          ]
        }
      )
    }
  );
}
function ConfirmDialog(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    import_dsh_client_ui_primitives.Modal,
    {
      open: true,
      onClose: props.onClose,
      title: "\u786E\u8BA4\u5220\u9664",
      className: "zy-modal-form",
      description: props.message,
      footer: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(Foot, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "zy-btn", type: "button", onClick: props.onClose, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "zy-btn zy-danger", type: "button", disabled: props.busy, onClick: props.onConfirm, children: "\u5220\u9664" })
      ] })
    }
  );
}

// src/client/settings/LibPage.tsx
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/settings/icons.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function TrashIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { className: "zy-ico", width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.4", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M3.5 4.5h9M6.2 4.5V3.2h3.6v1.3M5.2 4.5l.6 8.2h4.4l.6-8.2M6.8 7v4M9.2 7v4" }) });
}
function SearchIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { className: "zy-ico", width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "7", cy: "7", r: "4.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M10.2 10.2L13 13" })
  ] });
}
function TwistIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { className: "zy-twist", width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M4.25 2.83v8.34c0 .49.59.74.94.39l4.17-4.17a.55.55 0 0 0 0-.78L5.19 2.44c-.35-.35-.94-.1-.94.39Z", fill: "currentColor" }) });
}

// src/client/settings/LibPage.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function LibPage(props) {
  if (!props.bases.length) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "zy-lib is-empty", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "zy-cab", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { children: "\u5148\u65B0\u5EFA\u77E5\u8BC6\u5E93" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "\u5199\u4E0A\u6807\u9898\u548C\u63CF\u8FF0\uFF0C\u8BF4\u660E\u8FD9\u4E2A\u5E93\u88C5\u4EC0\u4E48\u3002\u7136\u540E\u624D\u80FD\u5BFC\u5165\u6587\u4EF6\u3001\u5728\u5BF9\u8BDD\u91CC\u63D0\u95EE\u3002\u5BFC\u5165\u4E0D\u4F1A\u81EA\u52A8\u5EFA\u5E93\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-btn zy-primary", type: "button", onClick: props.onCreate, children: "\u65B0\u5EFA\u77E5\u8BC6\u5E93" })
    ] }) }) });
  }
  const current = props.current;
  const { lead, rest } = doorParts(current?.description ?? "");
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-lib", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-list", children: [
      props.bases.map((base) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: `zy-row${current?.id === base.id ? " is-on" : ""}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-base", type: "button", onClick: () => props.onSelect(base.id), children: base.title || base.id }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-del", type: "button", "aria-label": `\u5220\u9664 ${base.title}`, onClick: () => props.onDeleteBase(base), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TrashIcon, {}) })
      ] }, base.id)),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-ghost", type: "button", onClick: props.onCreate, children: "+ \u65B0\u5EFA\u77E5\u8BC6\u5E93" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "zy-cab", children: current ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-cab-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "zy-sub", children: headMeta(current) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-btn", type: "button", onClick: props.onEdit, children: "\u7F16\u8F91" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-btn zy-primary", type: "button", onClick: props.onImport, children: "\u5BFC\u5165" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Door, { lead, rest, aliases: current.aliases }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-tree", children: [
        props.pending ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "zy-help", children: "\u52A0\u8F7D\u4E2D\u2026" }) : null,
        props.tree.map((node) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TreeItem, { node, onOpen: props.onOpenFile, onDelete: props.onDeleteEntry }, node.path))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-foot", children: [
        jobDot(props.job),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: jobText(props.job) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-icon", type: "button", onClick: props.onSearch, "aria-label": "\u641C\u7D22", title: "\u641C\u7D22", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SearchIcon, {}) })
      ] })
    ] }) : null })
  ] });
}
function headMeta(base) {
  const parts = [`${base.approxDocs} \u7BC7`, `${base.categories.length} \u4E2A\u7C7B\u76EE`];
  if (base.lastUsed) parts.push("\u4E0A\u6B21\u7528");
  return parts.join(" \xB7 ");
}
function doorParts(description) {
  const text = description.trim();
  if (!text) return { lead: "\u6CA1\u6709\u63CF\u8FF0", rest: "" };
  const cut = text.indexOf("\u3002");
  if (cut === -1 || cut >= text.length - 1) return { lead: text.replace(/。$/, ""), rest: "" };
  return { lead: text.slice(0, cut), rest: text.slice(cut + 1).trim() };
}
function Door(props) {
  const alias = props.aliases.length ? `\u522B\u540D\uFF1A${props.aliases.join(", ")}` : "";
  const extra = Boolean(props.rest || alias);
  const body = extra ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-door-body", children: [
    props.rest || null,
    alias ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "zy-help", children: alias }) : null
  ] }) : null;
  if (!extra) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "zy-door zy-door-shut", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "zy-lead", children: props.lead }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "zy-door", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("summary", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TwistIcon, {}),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "zy-lead", children: props.lead })
    ] }),
    body
  ] });
}
function jobDot(job) {
  if (!job) return null;
  if (job.running) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives2.StateDot, { state: "ongoing", size: 8 });
  if (job.failed.length) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives2.StateDot, { state: "error", size: 8 });
  return null;
}
function jobText(job) {
  if (!job) return "\u4EFB\u52A1 \u65E0";
  if (job.running) return `\u4EFB\u52A1\u8FDB\u884C\u4E2D\uFF1A${job.op ?? ""}`;
  const fail = job.failed.length;
  return fail ? `\u5931\u8D25 ${fail}\uFF0C\u65AD\u8FDE\u540E\u4ECD\u4FDD\u7559` : "\u4EFB\u52A1 \u65E0";
}
function TreeItem(props) {
  const del = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { className: "zy-del", type: "button", "aria-label": `\u5220\u9664 ${props.node.name}`, onClick: () => props.onDelete(props.node.path, props.node.kind), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TrashIcon, {}) });
  if (props.node.kind === "dir") {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { open: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("summary", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TwistIcon, {}),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: props.node.name }),
        del
      ] }),
      (props.node.children ?? []).map((child) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TreeItem, { node: child, onOpen: props.onOpen, onDelete: props.onDelete }, child.path))
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "zy-file", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "zy-file-open", onClick: () => props.onOpen(props.node.path), children: props.node.name }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "meta", children: formatSize(props.node.size) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "when", children: formatWhen(props.node.mtime) }),
    del
  ] });
}
function formatSize(size) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  return `${Math.round(size / 1024)} KB`;
}
function formatWhen(mtime) {
  if (!mtime) return "";
  const days = Math.floor((Date.now() - mtime) / 864e5);
  if (days < 1) return "\u4ECA\u5929";
  if (days < 2) return "\u6628\u5929";
  if (days < 7) return "\u4E0A\u5468";
  return `${new Date(mtime).getMonth() + 1} \u6708`;
}

// src/client/settings/more-dialogs.tsx
var import_react2 = require("react");
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime5 = require("react/jsx-runtime");
function readForm2(event) {
  event.preventDefault();
  return new FormData(event.currentTarget);
}
function ImportDialog(props) {
  const form = (0, import_react2.useRef)(null);
  const pathRef = (0, import_react2.useRef)(null);
  const [createMissing, setCreateMissing] = (0, import_react2.useState)(true);
  const [preserveTree, setPreserveTree] = (0, import_react2.useState)(false);
  const [picking, setPicking] = (0, import_react2.useState)(false);
  const pick = async (kind) => {
    if (picking || props.busy) return;
    setPicking(true);
    try {
      const path = await props.onPick(kind);
      if (path && pathRef.current) pathRef.current.value = path;
    } finally {
      setPicking(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    import_dsh_client_ui_primitives3.Modal,
    {
      open: true,
      onClose: props.onClose,
      title: `\u5BFC\u5165\u5230 ${props.baseId}`,
      className: "zy-modal-form",
      footer: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "zy-footbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-btn", type: "button", onClick: props.onClose, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-btn zy-primary", type: "button", disabled: props.busy, onClick: () => form.current?.requestSubmit(), children: "\u5F00\u59CB\u5BFC\u5165" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "form",
        {
          ref: form,
          onSubmit: (event) => {
            const data = readForm2(event);
            props.onSubmit({
              sourcePath: String(data.get("sourcePath") ?? "").trim(),
              destCategory: String(data.get("destCategory") ?? "").trim(),
              preserveTree,
              createMissing
            });
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
              Field,
              {
                label: "\u6E90",
                help: "\u70B9\u6309\u94AE\u6253\u5F00\u7CFB\u7EDF\u5BF9\u8BDD\u6846\u9009\u672C\u673A\u76EE\u5F55\u6216\u6587\u4EF6\u3002\u4E5F\u53EF\u4EE5\u7C98\u8D34\u5B8C\u6574\u8DEF\u5F84\u3002\u76EE\u524D md/txt\u3002",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "zy-source", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-btn", type: "button", disabled: picking || props.busy, onClick: () => void pick("dir"), children: "\u9009\u62E9\u6587\u4EF6\u5939" }),
                    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-btn", type: "button", disabled: picking || props.busy, onClick: () => void pick("file"), children: "\u9009\u62E9\u6587\u4EF6" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { ref: pathRef, className: "zy-box", name: "sourcePath", placeholder: "~/notes/\u5408\u540C", required: true })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "\u7C7B\u76EE", help: "\u7A7A = \u5E93\u6839\u3002\u53EF\u8F93\u5165\u65B0\u8DEF\u5F84\uFF0C\u4E0D\u4F1A\u56E0\u6B64\u65B0\u5EFA\u77E5\u8BC6\u5E93\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { className: "zy-box", name: "destCategory", placeholder: "\u5408\u540C/2024" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "zy-checks", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "checkbox", checked: createMissing, onChange: () => setCreateMissing((value) => !value) }),
                "\u76EE\u5F55\u4E0D\u5B58\u5728\u5219\u521B\u5EFA"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "checkbox", checked: preserveTree, onChange: () => setPreserveTree((value) => !value) }),
                "\u4FDD\u7559\u6E90\u76EE\u5F55\u7ED3\u6784"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Note, { text: props.error })
          ]
        }
      )
    }
  );
}
function SearchDialog(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_dsh_client_ui_primitives3.Modal, { open: true, onClose: props.onClose, title: `\u641C\u7D22  ${props.baseId}`, className: "zy-modal-form", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "form",
      {
        onSubmit: (event) => {
          props.onSearch(String(readForm2(event).get("query") ?? ""));
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "zy-search-bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { className: "zy-box", name: "query", placeholder: "\u5173\u952E\u8BCD", defaultValue: props.query, autoFocus: true }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-icon", type: "submit", "aria-label": "\u641C\u7D22", disabled: props.busy, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SearchIcon, {}) })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Note, { text: props.warning }),
    props.busy ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "zy-help", children: "\u68C0\u7D22\u4E2D\u2026" }) : null,
    props.hits.length ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "zy-search-hits", children: props.hits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("button", { className: "zy-hit-line", type: "button", onClick: () => props.onOpen(hit), children: [
      hit.path,
      ":",
      hit.startLine,
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(HitMark, { text: hit.excerpt.split("\n").find((line) => line.trim()) ?? "", query: props.query })
    ] }, `${hit.n}-${hit.path}-${hit.startLine}`)) }) : null,
    props.searched && !props.busy && !props.hits.length && !props.warning ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "zy-help", children: "\u65E0\u547D\u4E2D" }) : null
  ] });
}
function HitMark(props) {
  const q = props.query.trim();
  const i = q ? props.text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: props.text });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
    props.text.slice(0, i),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("mark", { children: props.text.slice(i, i + q.length) }),
    props.text.slice(i + q.length)
  ] });
}
function PreviewDialog(props) {
  const form = (0, import_react2.useRef)(null);
  const fileName = props.path.split("/").pop() || props.path;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    import_dsh_client_ui_primitives3.Modal,
    {
      open: true,
      onClose: props.onClose,
      title: fileName,
      description: props.path,
      className: "zy-modal-wide",
      footer: props.readonly ? void 0 : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "zy-footbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-btn zy-danger", type: "button", onClick: props.onDelete, children: "\u5220\u9664" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-btn", type: "button", onClick: props.onClose, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "zy-btn zy-primary", type: "button", disabled: props.busy, onClick: () => form.current?.requestSubmit(), children: "\u4FDD\u5B58" })
      ] }),
      children: [
        props.readonly ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(HighlightedPre, { text: props.text, startLine: props.startLine, endLine: props.endLine }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "form",
          {
            ref: form,
            onSubmit: (event) => {
              if (!props.onSave) return;
              props.onSave(String(readForm2(event).get("text") ?? ""));
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("textarea", { className: "zy-area", name: "text", defaultValue: props.text, style: { minHeight: 280 } })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Note, { text: props.error })
      ]
    }
  );
}
function HighlightedPre(props) {
  const markRef = (0, import_react2.useRef)(null);
  const start = props.startLine && props.startLine > 0 ? props.startLine : 0;
  const end = props.endLine && props.endLine >= start ? props.endLine : start;
  (0, import_react2.useEffect)(() => {
    markRef.current?.scrollIntoView({ block: "center" });
  }, [start, end, props.text]);
  if (!start) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "zy-pre", children: props.text });
  const lines = props.text.split(/\r?\n/);
  const first = Math.min(start, lines.length);
  const last = Math.min(end || first, lines.length);
  const before = lines.slice(0, first - 1).join("\n");
  const mid = lines.slice(first - 1, last).join("\n");
  const after = lines.slice(last).join("\n");
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("pre", { className: "zy-pre", children: [
    before,
    before && mid ? "\n" : "",
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("mark", { ref: markRef, className: "zy-hl", children: mid }),
    after ? `
${after}` : ""
  ] });
}

// src/client/settings/PrefsPage.tsx
var import_react3 = require("react");
var import_dsh_client_ui_primitives4 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime6 = require("react/jsx-runtime");
function PrefsPage(props) {
  const [draft, setDraft] = (0, import_react3.useState)(props.prefs);
  const [menuOpen, setMenuOpen] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
    setDraft(props.prefs);
  }, [props.prefs]);
  const current = props.bases.find((base) => base.id === draft.defaultBaseId);
  const label = current ? `${current.id}\uFF08${current.title}\uFF09` : "\uFF08\u65E0\uFF09";
  const commit = (next) => {
    setDraft(next);
    props.onSave(next);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-set-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-set-text", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "zy-set-title", children: "\u9ED8\u8BA4\u6253\u5F00\u7684\u5E93" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "zy-set-desc", children: "\u672A\u6307\u5B9A\u77E5\u8BC6\u5E93\u65F6\uFF0C\u5DE5\u4F5C\u53F0\u641C\u7D22\u4F7F\u7528\u8FD9\u4E2A\u9ED8\u8BA4\u5E93\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        import_dsh_client_ui_primitives4.Menu,
        {
          open: menuOpen,
          onClose: () => setMenuOpen(false),
          selectedId: draft.defaultBaseId || "none",
          items: [
            { id: "none", label: "\uFF08\u65E0\uFF09" },
            ...props.bases.map((base) => ({ id: base.id, label: `${base.id}\uFF08${base.title}\uFF09` }))
          ],
          onSelect: (id) => {
            commit({ ...draft, defaultBaseId: id === "none" ? "" : id });
            setMenuOpen(false);
          },
          align: "end",
          portal: true,
          anchor: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              className: "zy-selector",
              "aria-haspopup": "menu",
              "aria-expanded": menuOpen,
              onClick: () => setMenuOpen(!menuOpen),
              children: [
                label,
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives4.IconChevronDownOutline14, { className: "zy-chevron" })
              ]
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-set-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-set-text", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "zy-set-title", children: "\u5355\u6587\u4EF6\u4E0A\u9650" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "zy-set-desc", children: "\u8D85\u8FC7\u5219\u8BE5\u6587\u4EF6\u5BFC\u5165\u5931\u8D25\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "input",
        {
          className: "zy-selector zy-num",
          value: `${Math.round(draft.maxFileBytes / 1024 / 1024)} MB`,
          onChange: (event) => {
            const n = parseInt(event.target.value, 10);
            if (!Number.isFinite(n) || n < 1) return;
            setDraft({ ...draft, maxFileBytes: n * 1024 * 1024 });
          },
          onBlur: () => props.onSave(draft)
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-set-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-set-text", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "zy-set-title", children: "\u5355\u5E93\u6587\u5B57\u4E0A\u9650" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "zy-set-desc", children: "\u8D85\u8FC7\u62D2\u7EDD\u672C\u6279\u5BFC\u5165\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "input",
        {
          className: "zy-selector zy-num",
          value: `${Math.round(draft.maxBaseBytes / 1024 / 1024 / 1024)} GB`,
          onChange: (event) => {
            const n = parseInt(event.target.value, 10);
            if (!Number.isFinite(n) || n < 1) return;
            setDraft({ ...draft, maxBaseBytes: n * 1024 * 1024 * 1024 });
          },
          onBlur: () => props.onSave(draft)
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "zy-set-title zy-prefs-h", children: "\u89E3\u6790\u5668" }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-parser", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { type: "checkbox", checked: true, disabled: true }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "Markdown / txt" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-parser is-off", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { type: "checkbox", disabled: true }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "PDF" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-parser is-off", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { type: "checkbox", disabled: true }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "DOCX" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "zy-parser is-off", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { type: "checkbox", disabled: true }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "\u81EA\u5B9A\u4E49\u547D\u4EE4" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Note, { text: props.error })
  ] });
}

// src/client/settings/SectionIcon.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var BOOK_COVER_D = "M3.15 1.55h9.7c.8 0 1.45.65 1.45 1.45v9.9c0 .8-.65 1.45-1.45 1.45H3.15c-.8 0-1.45-.65-1.45-1.45V3c0-.8.65-1.45 1.45-1.45Zm0 1.4c-.03 0-.05.02-.05.05v9.9c0 .03.02.05.05.05h9.7c.03 0 .05-.02.05-.05V3c0-.03-.02-.05-.05-.05H3.15Z";
var BOOK_SPINE_D = "M4.5 3.15h1.25v8.8H4.5z";
var BOOK_RIBBON_D = "M9.95 1.55h1.45v4.25l-.725-.52-.725.52V1.55z";
function SectionIcon(props) {
  const size = props.size ?? 16;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
    "svg",
    {
      width: size,
      height: size,
      className: props.className,
      viewBox: "0 0 16 16",
      fill: "none",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { fill: "currentColor", fillRule: "evenodd", clipRule: "evenodd", d: BOOK_COVER_D }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { fill: "currentColor", d: BOOK_SPINE_D }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { fill: "currentColor", d: BOOK_RIBBON_D })
      ]
    }
  );
}

// src/client/settings/styles.ts
var STYLE_ID = "dsh-zhiyuan-settings-css";
function ensureSettingsStyles() {
  if (typeof document === "undefined" || !document.head) return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = CSS;
}
function disposeSettingsStyles() {
  if (typeof document === "undefined") return;
  document.getElementById(STYLE_ID)?.remove();
}
var CSS = `
.zy{font:inherit;color:var(--dsw-alias-label-primary);height:100%;min-height:420px;display:flex;flex-direction:column;gap:8px}
.zy-head{display:flex;align-items:center;gap:16px;min-height:36px;flex:none}
.zy-head-title{display:flex;align-items:center;gap:8px;flex:1;min-width:0}
.zy-head-title svg{flex:none}
.zy-head-title h1{margin:0;font-size:18px;font-weight:600;line-height:24px}
.zy-tabs{display:flex;gap:16px;align-items:center;flex:none}
.zy-tab{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);padding:6px 1px 8px;font:inherit;font-size:13px;line-height:20px;box-shadow:inset 0 -2px 0 transparent;cursor:pointer;white-space:nowrap}
.zy-tab:hover,.zy-tab.is-on{color:var(--dsw-alias-label-primary)}
.zy-tab.is-on{box-shadow:inset 0 -2px 0 var(--dsw-alias-label-primary)}
.zy-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.zy-note{margin:0;color:var(--dsw-alias-state-error-primary);font-size:13px;display:flex;align-items:center;gap:6px}
.zy-lib{flex:1;min-height:0;display:grid;grid-template-columns:168px minmax(0,1fr)}
.zy-lib.is-empty{grid-template-columns:1fr}
.zy-list,.zy-cab{border:1px solid var(--dsw-alias-border-l2);min-height:0}
.zy-list{border-radius:12px 0 0 12px;border-right:none;display:flex;flex-direction:column;padding:4px 4px 6px}
.zy-cab{border-radius:0 12px 12px 0;padding:0;display:flex;flex-direction:column}
.zy-lib.is-empty .zy-cab{border-radius:12px;justify-content:center;align-items:center;border-left:1px solid var(--dsw-alias-border-l2)}
.zy-row{position:relative;border-radius:12px}
.zy-row:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}
.zy-row.is-on,.zy-row.is-on:hover{background:var(--dsw-specific-sidebar-nav-item-active)}
.zy-base{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 28px 8px 10px;border-radius:12px;color:inherit;font:inherit;font-weight:500}
.zy-del{width:22px;height:22px;border:none;background:transparent;border-radius:6px;padding:0;color:var(--dsw-alias-label-tertiary);display:inline-flex;align-items:center;justify-content:center;opacity:0;flex:none;cursor:pointer}
.zy-row .zy-del{position:absolute;right:6px;top:8px}
.zy-row:hover .zy-del,.zy-file:hover .zy-del,.zy-tree summary:hover .zy-del,.zy-del:focus{opacity:1}
.zy-del:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}
.zy-ghost{margin-top:auto;border:1px dashed var(--dsw-alias-border-l2);background:transparent;border-radius:12px;padding:8px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.zy-ghost:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-cab-head{display:flex;align-items:center;gap:10px;padding:8px 12px 6px}
.zy-cab-head .zy-sub{flex:1;min-width:0}
.zy-sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.zy-actions{margin-left:auto;display:flex;gap:8px;flex:none}
.zy-btn,.zy-ghost,.zy-icon,.zy-tab,.zy-del,.zy-base,.zy-selector,.zy-box,.zy-area{appearance:none}
.zy-btn{height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-elevated-fill);border-radius:16px;font:inherit;font-size:13px;color:inherit;cursor:pointer}
.zy-btn:hover{background:var(--dsw-alias-button-floating-hover)}
.zy-btn:disabled{opacity:.5;cursor:not-allowed}
.zy-primary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground)}
.zy-primary:hover{background:var(--dsw-alias-button-primary-hover)}
.zy-danger{border-color:var(--dsw-alias-state-error-secondary);background:transparent;color:var(--dsw-alias-state-error-primary)}
.zy-danger:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.zy-door{margin:0 10px 4px;background:var(--dsw-alias-bg-module-platform);border-radius:10px;font-size:12px;line-height:18px;flex:none}
.zy-door>summary,.zy-door-shut{cursor:pointer;list-style:none;padding:6px 10px;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:6px;min-width:0}
.zy-door-shut{cursor:default}
.zy-lead{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-door>summary::-webkit-details-marker,.zy-door>summary::marker,.zy-tree summary::-webkit-details-marker,.zy-tree summary::marker{display:none;content:none}
.zy-door>summary:hover{color:var(--dsw-alias-label-primary)}
.zy-twist{width:14px;height:14px;flex:none;color:var(--dsw-alias-label-tertiary);transition:transform .15s cubic-bezier(.4,0,.2,1)}
details[open]>summary>.zy-twist{transform:rotate(90deg)}
.zy-door-body{padding:0 10px 8px}
.zy-tree{flex:1;min-height:0;overflow:auto;padding:2px 8px 8px}
.zy-tree details{padding-left:10px}
.zy-tree>details{padding-left:0}
.zy-tree summary{cursor:pointer;list-style:none;padding:3px 8px;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:6px}
.zy-tree summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-tree summary>span{flex:1;min-width:0}
.zy-file{display:grid;grid-template-columns:minmax(0,1fr) auto auto 22px;gap:12px;padding:3px 8px 3px 22px;border-radius:8px;font-size:13px;align-items:center}
.zy-file:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-file .meta,.zy-file .when{color:var(--dsw-alias-label-tertiary)}
.zy-file-open{border:0;background:transparent;text-align:left;color:inherit;font:inherit;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-foot{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:12px}
.zy-icon{width:32px;height:32px;margin-left:auto;border:none;background:transparent;border-radius:50%;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.zy-icon:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-empty{text-align:center;max-width:36ch;padding:24px 16px;color:var(--dsw-alias-label-tertiary)}
.zy-empty h2{margin:0;color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500}
.zy-empty p{margin:8px 0 0;font-size:13px;line-height:20px}
.zy-empty .zy-btn{margin-top:16px}
.zy-set-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.zy-set-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-right:24px}
.zy-set-title{font-size:14px;line-height:22px}
.zy-set-desc{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.zy-selector{display:inline-flex;align-items:center;gap:12px;height:36px;padding:0 14px;border:none;border-radius:18px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;font-size:14px;cursor:pointer;width:auto;box-sizing:border-box}
.zy-selector:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-num{width:120px;cursor:text}
.zy-chevron{flex:none}
.zy-parser{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:center;padding:10px 0;font-size:14px}
.zy-parser+.zy-parser{border-top:1px solid var(--dsw-alias-border-l2)}
.zy-parser.is-off{color:var(--dsw-alias-label-tertiary);pointer-events:none}
.zy-prefs-h{margin:0;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2);font-size:14px;font-weight:400;line-height:22px}
.zy-field{margin:0 0 12px}
.zy-field label{display:block;font-size:13px;margin-bottom:4px}
.zy-box,.zy-area{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:8px 12px;color:inherit;font-family:inherit;font-size:13px;line-height:20px}
.zy-box[readonly]{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-module-platform)}
.zy-area{min-height:72px;resize:vertical}
.zy-help{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.zy-checks{display:flex;flex-direction:column;gap:8px;margin:8px 0 12px;font-size:13px}
.zy-checks label{display:flex;align-items:center;gap:8px;cursor:pointer}
.zy-source{display:flex;gap:8px;margin-bottom:8px}
.zy-footbar{display:flex;justify-content:flex-end;gap:8px;width:100%}
.zy-footbar .zy-danger{margin-right:auto}
.zy-about{max-width:62ch}
.zy-about h3{margin:20px 0 8px;font-size:14px;font-weight:500}
.zy-about p,.zy-about li{margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.zy-about ol{margin:0 0 8px;padding-left:1.2em}
.zy-about code{font-family:var(--ds-font-family-code);font-size:12px;background:var(--dsw-alias-markdown-inline-code);border-radius:4px;padding:0 4px}
.zy-demo{background:var(--dsw-alias-bg-module-platform);border-radius:10px;padding:10px 12px;margin:0 0 8px}
.zy-q{font-size:13px;font-weight:500;line-height:20px}
.zy-a{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.zy-pre{white-space:pre-wrap;font-family:var(--ds-font-family-code);font-size:13px;line-height:22px;max-height:min(60vh,520px);overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:8px 12px}
.zy-search-bar{display:flex;gap:8px;align-items:center;margin:0 0 12px}
.zy-search-bar .zy-box{flex:1;height:32px;border-radius:16px;padding:0 12px}
.zy-search-bar .zy-icon{margin-left:0}
.zy-search-hits{max-height:280px;overflow:auto;background:var(--dsw-alias-markdown-code-block);border-radius:8px;padding:8px 12px;font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.zy-search-hits mark,.zy-pre mark.zy-hl{background:var(--dsw-specific-bubble-highlight);color:inherit}
.zy-hit-line{display:block;width:100%;border:0;background:transparent;text-align:left;color:inherit;font:inherit;padding:2px 0;cursor:pointer}
.zy-hit-line:hover{color:var(--dsw-alias-label-primary)}
.zy-hit{width:100%;text-align:left;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;background:var(--dsw-alias-bg-layer-1);margin:0 0 4px;color:inherit;font:inherit}
.zy-hit:hover{background:var(--dsw-alias-interactive-bg-hover)}
.zy-src{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-bottom:2px}
.zy-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zy-quote{font-size:13px;line-height:20px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.zy-ntag{font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;background:var(--dsw-alias-markdown-citation);padding:0 5px;border-radius:4px;flex:none}
.zy :focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.zy-modal-wide{width:min(640px,calc(100% - 32px))}
.zy-modal-form{width:min(400px,calc(100% - 32px))}
`;

// src/client/settings/Section.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function createSettingsSection(remote, sessions, workspaces) {
  return function ZhiyuanSettings() {
    ensureSettingsStyles();
    const [tab, setTab] = (0, import_react4.useState)("lib");
    const [bases, setBases] = (0, import_react4.useState)([]);
    const [currentId, setCurrentId] = (0, import_react4.useState)("");
    const [tree, setTree] = (0, import_react4.useState)([]);
    const [prefs, setPrefs] = (0, import_react4.useState)({ defaultBaseId: "", maxFileBytes: 5242880, maxBaseBytes: 10737418240 });
    const [job, setJob] = (0, import_react4.useState)(void 0);
    const [dialog, setDialog] = (0, import_react4.useState)(null);
    const [pending, setPending] = (0, import_react4.useState)(false);
    const [error, setError] = (0, import_react4.useState)("");
    const [note, setNote] = (0, import_react4.useState)("");
    const [hits, setHits] = (0, import_react4.useState)([]);
    const [query, setQuery] = (0, import_react4.useState)("");
    const [searched, setSearched] = (0, import_react4.useState)(false);
    const [searchBusy, setSearchBusy] = (0, import_react4.useState)(false);
    const [previewFrom, setPreviewFrom] = (0, import_react4.useState)("tree");
    const [preview, setPreview] = (0, import_react4.useState)({ path: "", text: "", readonly: false, startLine: 0, endLine: 0 });
    const [confirm, setConfirm] = (0, import_react4.useState)({ message: "", run: async () => void 0 });
    const current = bases.find((item) => item.id === currentId);
    const call = (payload) => kbCall(remote, sessions, workspaces, payload);
    const refresh = async (id) => {
      setPending(true);
      setNote("");
      try {
        const list = await call({ op: "list" });
        setBases(list);
        const nextId = id || currentId || list.find((item) => item.lastUsed)?.id || list[0]?.id || "";
        setCurrentId(nextId);
        if (nextId) setTree(await call({ op: "tree", id: nextId }));
        else setTree([]);
        setPrefs(await call({ op: "prefs" }));
        setJob(await kbStatus(remote, sessions, workspaces));
      } catch (err) {
        setNote(err instanceof Error ? err.message : String(err));
      } finally {
        setPending(false);
      }
    };
    (0, import_react4.useEffect)(() => {
      void refresh();
    }, []);
    const run = async (work) => {
      setError("");
      setPending(true);
      try {
        await work();
        setDialog(null);
        await refresh(currentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setPending(false);
      }
    };
    const aliases = (text) => text.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "zy", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "zy-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "zy-head-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SectionIcon, { size: 18 }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h1", { children: SECTION_LABEL })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "zy-tabs", role: "tablist", children: ["lib", "prefs", "about"].map((id) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": tab === id,
            className: tab === id ? "zy-tab is-on" : "zy-tab",
            onClick: () => setTab(id),
            children: id === "lib" ? "\u77E5\u8BC6\u5E93" : id === "prefs" ? "\u504F\u597D" : "\u5173\u4E8E"
          },
          id
        )) })
      ] }),
      note ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("p", { className: "zy-note", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives5.IconWarningOutline16, { size: 14 }),
        note
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "zy-body", children: [
        tab === "lib" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          LibPage,
          {
            bases,
            current,
            tree,
            job,
            pending,
            onSelect: (id) => {
              setCurrentId(id);
              void refresh(id);
            },
            onCreate: () => {
              setError("");
              setDialog("create");
            },
            onEdit: () => {
              setError("");
              setDialog("edit");
            },
            onImport: () => {
              setError("");
              setDialog("import");
            },
            onSearch: () => {
              setHits([]);
              setQuery("");
              setSearched(false);
              setError("");
              setDialog("search");
            },
            onDeleteBase: (base) => {
              setConfirm({ message: `\u5220\u9664\u77E5\u8BC6\u5E93\u300C${base.title}\u300D\u53CA\u5176\u4E2D\u6587\u4EF6\uFF1F`, run: () => run(() => call({ op: "deleteBase", id: base.id, confirm: true }).then(() => void 0)) });
              setDialog("confirm");
            },
            onOpenFile: (path) => {
              void call({ op: "read", id: currentId, path }).then((value) => {
                const rec = value;
                setPreview({ path: rec.path, text: rec.text, readonly: false, startLine: 0, endLine: 0 });
                setPreviewFrom("tree");
                setDialog("preview");
              }).catch((err) => setNote(err instanceof Error ? err.message : String(err)));
            },
            onDeleteEntry: (path, kind) => {
              setConfirm({
                message: kind === "dir" ? `\u5220\u9664\u7C7B\u76EE\u300C${path}\u300D\uFF1F` : `\u5220\u9664\u6587\u4EF6\u300C${path}\u300D\uFF1F`,
                run: () => run(() => call({ op: "deleteEntry", id: currentId, path, confirm: true }).then(() => void 0))
              });
              setDialog("confirm");
            }
          }
        ) : null,
        tab === "prefs" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PrefsPage, { prefs, bases, busy: pending, error, onSave: (next) => void run(() => call({ op: "setPrefs", ...next }).then(() => void 0)) }) : null,
        tab === "about" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(AboutPage, {}) : null
      ] }),
      dialog === "create" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(CreateDialog, { error, busy: pending, onClose: () => setDialog(null), onSubmit: (input) => void run(() => call({ op: "create", ...input, aliases: aliases(input.aliases) }).then(() => void 0)) }) : null,
      dialog === "edit" && current ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        EditDialog,
        {
          base: current,
          error,
          busy: pending,
          onClose: () => setDialog(null),
          onDelete: () => {
            setConfirm({ message: `\u5220\u9664\u77E5\u8BC6\u5E93\u300C${current.title}\u300D\u53CA\u5176\u4E2D\u6587\u4EF6\uFF1F`, run: () => run(() => call({ op: "deleteBase", id: current.id, confirm: true }).then(() => void 0)) });
            setDialog("confirm");
          },
          onSubmit: (input) => void run(() => call({ op: "update", id: current.id, ...input, aliases: aliases(input.aliases) }).then(() => void 0))
        }
      ) : null,
      dialog === "import" && current ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        ImportDialog,
        {
          baseId: current.id,
          error,
          busy: pending,
          onClose: () => setDialog(null),
          onPick: async (kind) => {
            setError("");
            try {
              const rec = await call({ op: "pick", kind });
              return rec.path ?? "";
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
              return "";
            }
          },
          onSubmit: (input) => void run(() => call({ op: "ingest", ...input, baseId: current.id }).then(() => void 0))
        }
      ) : null,
      dialog === "search" && current ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        SearchDialog,
        {
          baseId: current.id,
          query,
          hits,
          warning: error,
          busy: searchBusy,
          searched,
          onClose: () => setDialog(null),
          onSearch: (next) => {
            setQuery(next);
            setSearchBusy(true);
            setError("");
            void call({ op: "search", baseId: current.id, query: next }).then((value) => {
              const result = value;
              setHits(result.hits);
              setError(result.warnings?.join(" ") ?? "");
              setSearched(true);
            }).catch((err) => {
              setHits([]);
              setError(err instanceof Error ? err.message : String(err));
              setSearched(true);
            }).finally(() => setSearchBusy(false));
          },
          onOpen: (hit) => {
            void call({ op: "read", id: current.id, path: hit.path }).then((value) => {
              const rec = value;
              setPreview({ path: rec.path, text: rec.text, readonly: true, startLine: hit.startLine, endLine: hit.endLine });
              setPreviewFrom("search");
              setDialog("preview");
            }).catch((err) => setError(err instanceof Error ? err.message : String(err)));
          }
        }
      ) : null,
      dialog === "preview" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        PreviewDialog,
        {
          path: preview.path,
          text: preview.text,
          startLine: preview.startLine,
          endLine: preview.endLine,
          readonly: preview.readonly,
          error,
          busy: pending,
          onClose: () => setDialog(previewFrom === "search" ? "search" : null),
          onSave: (text) => void run(() => call({ op: "write", id: currentId, path: preview.path, text }).then(() => void 0)),
          onDelete: () => {
            setConfirm({
              message: `\u5220\u9664\u6587\u4EF6\u300C${preview.path}\u300D\uFF1F`,
              run: () => run(() => call({ op: "deleteEntry", id: currentId, path: preview.path, confirm: true }).then(() => void 0))
            });
            setDialog("confirm");
          }
        }
      ) : null,
      dialog === "confirm" ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ConfirmDialog, { message: confirm.message, busy: pending, onClose: () => setDialog(null), onConfirm: () => void confirm.run() }) : null
    ] });
  };
}

// src/client/toolview/HitCard.tsx
var import_react5 = require("react");
var import_dsh_client_ui_primitives6 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime9 = require("react/jsx-runtime");
function firstText(content) {
  if (!Array.isArray(content)) return "";
  for (const block of content) {
    if (block?.type === "text" && typeof block.text === "string") return block.text;
  }
  return "";
}
function hitsFrom(block) {
  const meta = block?.meta;
  if (Array.isArray(meta?.hits)) return meta.hits;
  return [];
}
function KbSearchView(props) {
  ensureSettingsStyles();
  const block = props.block;
  const running = !block || block.kind !== "tool-result";
  const failed = block?.kind === "tool-result" && Boolean(block.isError);
  const hits = hitsFrom(block);
  const [open, setOpen] = (0, import_react5.useState)(null);
  if (running) return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "zy-help", children: "\u6B63\u5728\u68C0\u7D22\u77E5\u8BC6\u5E93\u2026" });
  if (failed) return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "zy-note", children: firstText(block?.content) || "\u68C0\u7D22\u5931\u8D25" });
  if (!hits.length) return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "zy-help", children: "\u65E0\u547D\u4E2D" });
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
    hits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("button", { className: "zy-hit", type: "button", onClick: () => setOpen(hit), children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "zy-src", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "zy-ntag", children: [
          "[",
          hit.n,
          "]"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "zy-path", children: [
          hit.path,
          ":",
          hit.startLine,
          "\u2013",
          hit.endLine
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "zy-quote", children: hit.excerpt.split("\n").find((line) => line.trim()) ?? hit.excerpt })
    ] }, `${hit.n}-${hit.path}-${hit.startLine}`)),
    open ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      import_dsh_client_ui_primitives6.Modal,
      {
        open: true,
        onClose: () => setOpen(null),
        title: "\u53EA\u8BFB\u9884\u89C8",
        description: `${open.path} \xB7 [${open.n}]`,
        className: "zy-modal-wide",
        footer: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { className: "zy-btn", type: "button", onClick: () => setOpen(null), children: "\u5173\u95ED" }),
        children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("pre", { className: "zy-pre", children: open.excerpt })
      }
    ) : null
  ] });
}

// src/client/nav-icon.ts
var NS = "http://www.w3.org/2000/svg";
var MARK = "data-zhiyuan-book";
function createBookSvg() {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute(MARK, "1");
  const cover = document.createElementNS(NS, "path");
  cover.setAttribute("d", BOOK_COVER_D);
  cover.setAttribute("fill", "currentColor");
  cover.setAttribute("fill-rule", "evenodd");
  cover.setAttribute("clip-rule", "evenodd");
  const spine = document.createElementNS(NS, "path");
  spine.setAttribute("d", BOOK_SPINE_D);
  spine.setAttribute("fill", "currentColor");
  const ribbon = document.createElementNS(NS, "path");
  ribbon.setAttribute("d", BOOK_RIBBON_D);
  ribbon.setAttribute("fill", "currentColor");
  svg.append(cover, spine, ribbon);
  return svg;
}
function isZhiyuanNavButton(button, label) {
  if (button.getAttribute("data-zhiyuan-nav") === "1") return true;
  return button.querySelector("span")?.textContent?.trim() === label;
}
function syncNav(getLabel, originals) {
  const label = getLabel();
  for (const button of document.querySelectorAll("button")) {
    if (!isZhiyuanNavButton(button, label)) continue;
    button.setAttribute("data-zhiyuan-nav", "1");
    const span = button.querySelector("span");
    if (span && span.textContent !== label) span.textContent = label;
    const svg = button.querySelector("svg");
    if (!svg || svg.getAttribute(MARK) === "1") continue;
    const keep = svg.cloneNode(true);
    const next = createBookSvg();
    const cls = svg.getAttribute("class");
    if (cls) next.setAttribute("class", cls);
    next.setAttribute("width", svg.getAttribute("width") ?? "16");
    next.setAttribute("height", svg.getAttribute("height") ?? "16");
    svg.replaceWith(next);
    originals.push({ button, svg: keep });
  }
}
function installZhiyuanNavIcon(getLabel = () => SECTION_LABEL) {
  if (typeof document === "undefined" || !document.body) return () => void 0;
  const originals = [];
  const sync = () => syncNav(getLabel, originals);
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync();
  return () => {
    observer.disconnect();
    for (const { button, svg } of originals) {
      button.querySelector(`svg[${MARK}]`)?.replaceWith(svg);
      button.removeAttribute("data-zhiyuan-nav");
    }
  };
}

// src/client/index.ts
var name = PACKAGE_NAME;
var inject = ["slots", "remote", "remote.commands", "sessions", "workspaces"];
function apply(ctx) {
  console.log("[zhiyuan] client loaded");
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: SECTION_ID,
    order: 35,
    label: () => SECTION_LABEL,
    registrant: PACKAGE_NAME
  }, createSettingsSection(ctx.remote, ctx.sessions, ctx.workspaces)));
  ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
    name: "tool.call.toolview",
    key: "kb_search",
    registrant: PACKAGE_NAME
  }, KbSearchView));
  if (typeof ctx.effect === "function") {
    ctx.effect(() => {
      const offNav = installZhiyuanNavIcon(() => SECTION_LABEL);
      return () => {
        offNav();
        disposeSettingsStyles();
        console.log("[zhiyuan] client unloaded");
      };
    });
  } else {
    installZhiyuanNavIcon(() => SECTION_LABEL);
  }
}

    return module.exports;
  },
});
