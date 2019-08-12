import * as FS from "fs-extra";
import * as Path from "path";
import { Component, ConverterComponent } from "typedoc/dist/lib/converter/components";
import { Context } from "typedoc/dist/lib/converter/context";
import { Converter } from "typedoc/dist/lib/converter/converter";
import { Options } from "typedoc/dist/lib/utils/options";
import { CommentTag, Comment } from "typedoc/dist/lib/models/comments";
import { PluginConstants } from "./PluginConstants";
import { Reflection } from "typedoc/dist/lib/models/reflections";

interface ICustomTagDeclaration {
  tagName: string;
  template: string;
  combine?: "none" | "header-ul" | "header-ol" | "ul" | "ol" | "block";
  combineMode: TagCombineMode;
  hidden?: boolean;
}

export const enum TagCombineMode {
  none = 0,
  headerUl = 1,
  headerOl = 2,
  ul = 3,
  ol = 4,
  block = 5
}

export interface IMatchingTag {
  index: number;
  tag: CommentTag;
  config: ICustomTagDeclaration;
}

@Component({ name: PluginConstants.ConverterPluginName })
export class CustomTagsPluginConverter extends ConverterComponent {

  private _declarations: { [key: string]: ICustomTagDeclaration } = {};

  public initialize(): void {
    this.listenTo(this.owner, {
      [Converter.EVENT_BEGIN]: this.onBegin,
      [Converter.EVENT_RESOLVE_BEGIN]: this.onBeginResolve,
    });
  }

  public onBegin(): void {
    const options: Options = this.application.options;

    try {
      const configPath: string = options.getValue(PluginConstants.ArgumentName);
      this._readConfigJson(configPath);
    } catch ( e ) {
        console.error(`typedoc-plugin-custom-tags: ${e.message}`);
    }
  }

  public onBeginResolve(context: Context): void {
    const reflections: { [id: number]: Reflection } = context.project.reflections;

    for (const key in reflections) {
      const comment: Comment | undefined = reflections[key].comment;

      this.resolveComment(comment);
    }
  }

  public resolveComment(comment: Comment | undefined): void {
    if (!comment || !comment.tags) {
      return;
    }

    const handledIndexes: number[] = [];
    const matchingTags: IMatchingTag[][] = [];
    let previousTagName: string = "";
    let tagGroup: IMatchingTag[] = [];
    for (let index: number = 0; index < comment.tags.length; index++) {
      const tag: CommentTag = comment.tags[index];
      if (!this._declarations.hasOwnProperty(tag.tagName) || !this._declarations[tag.tagName]) {
        continue;
      }
      const config: ICustomTagDeclaration = this._declarations[tag.tagName];

      if (previousTagName !== tag.tagName || config.combineMode === TagCombineMode.none) {
        tagGroup = [];
        matchingTags.push(tagGroup);
      }

      if (!config.hidden) {
        tagGroup.push({
          index: index,
          tag: tag,
          config: config
        });
      }
      handledIndexes.unshift(index);

      previousTagName = tag.tagName;
    }

    handledIndexes.forEach((index) => {
      (comment.tags || []).splice(index, 1);
    });

    (comment as any)["matchingTags"] = matchingTags;
  }

  private _readConfigJson(configPath: string): void {
    this._declarations = {};
    if (typeof configPath !== "string" || configPath.trim().length === 0) {
      return;
    }
      // load json
      const configAbsolutePath: string = Path.join(process.cwd(), configPath);

      let json: ICustomTagDeclaration[] | ICustomTagDeclaration | null = null;
      try {
          json = JSON.parse(FS.readFileSync(configAbsolutePath, "utf8"));
      } catch ( e ) {
          throw new Error(`error reading ${PluginConstants.ArgumentDisplayName} json file: ${e.message}`);
      }

      if (Array.isArray(json)) {
        for (let index = 0; index < json.length; index++) {
          this._processConfig(json[index]);
        }
      } else if (json && typeof json === "object") {
        this._processConfig(json);
      } else {
        throw new Error(`${PluginConstants.ArgumentDisplayName} json file has to have Array or single configuration object as root element`);
      }
  }

  private _processConfig(configJson: ICustomTagDeclaration): void {
    if (typeof configJson === "object"
        && configJson.hasOwnProperty("tagName") && typeof configJson.tagName === "string"
        && configJson.hasOwnProperty("template") && typeof configJson.template === "string") {

      const tagName: string = configJson.tagName.trim();
      if (tagName.length === 0) {
        throw new Error(`error reading ${PluginConstants.ArgumentName} json. Missing required property tagName.`);
      }
      if (this._declarations.hasOwnProperty(tagName) && this._declarations[tagName]) {
        throw new Error(`error reading ${PluginConstants.ArgumentName} json. The tagName ${tagName} is already defined.`);
      }

      const template: string = configJson.template;
      let combineMode: TagCombineMode = TagCombineMode.none;
      if (configJson.hasOwnProperty("combine") && typeof configJson.combine === "string") {
        switch (configJson.combine) {
          case "header-ul":
            combineMode = TagCombineMode.headerUl;
            break;
          case "header-ol":
            combineMode = TagCombineMode.headerOl;
            break;
          case "ul":
            combineMode = TagCombineMode.ul;
            break;
          case "ol":
            combineMode = TagCombineMode.ol;
            break;
          case "block":
            combineMode = TagCombineMode.block;
            break;
        }
      }

      this._declarations[tagName] = {
        tagName: tagName,
        template: template,
        combineMode: combineMode
      };
      return;
    }

    throw new Error(`${PluginConstants.ArgumentDisplayName} json file syntax has to be: [{"tagName": "STRING", template: "STRING (MARKDOWN FORMATTED)", combine?: "STRING", hidden?: "BOOLEAN"}, ETC.]`);
  }
}
