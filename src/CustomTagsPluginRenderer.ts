import { RendererComponent, Component } from "typedoc/dist/lib/output/components";
import { PluginConstants } from "./PluginConstants";
import { PageEvent } from "typedoc/dist/lib/output/events";
import { Reflection, ProjectReflection, DeclarationReflection, TraverseProperty } from "typedoc/dist/lib/models";
import { Comment, CommentTag } from "typedoc/dist/lib/models/comments";
import { IMatchingTag, TagCombineMode, CustomTagsPluginConverter } from "./CustomTagsPluginConverter";
import { MarkedPlugin } from "typedoc/dist/lib/output/plugins";

@Component({ name: PluginConstants.RendererPluginName })
export class CustomTagsPluginRenderer extends RendererComponent {

  private static readonly __tagRexEx: RegExp = /^@(\S+)/;
  private _processedReadme: boolean = false;

  /**
   * Create a new MarkedLinksPlugin instance.
   */
  initialize() {
    super.initialize();
    this.listenTo(this.owner, {
      [PageEvent.BEGIN]: this.onBeginPage,
    }, undefined, -1);
  }

  private onBeginPage(page: PageEvent): void {
    const markdownPlugin: MarkedPlugin = this.owner.owner.renderer.getComponent("marked") as MarkedPlugin;
    if (page.model instanceof ProjectReflection) {
      page.model.readme = this._processReadme(page.model.readme, markdownPlugin, page);
    } else if (page.model instanceof DeclarationReflection) {
      CustomTagsPluginRenderer.__processReflection(page.model, markdownPlugin, page);
    }
  }

  private _processReadme(readme: string | undefined, markdownPlugin: MarkedPlugin, context: any): string | undefined {
    if (typeof readme !== "string" || this._processedReadme) {
      return readme;
    }
    this._processedReadme = true;
    const pluginConverter: CustomTagsPluginConverter = this.owner.owner.converter.getComponent(PluginConstants.ConverterPluginName) as CustomTagsPluginConverter;
    const rawLines: string[] = readme.split("\n");
    const processLines: string[] = [];
    let readmeComment: Comment | undefined = undefined;
    let previousTagName: string | null = null;
    let newLines: string = "";
    for (let index: number = 0; index < rawLines.length; index++) {
      const rawLine: string = rawLines[index];
      let processLine: string = rawLine;
      let tagName: string | null = null;
      if (rawLine.length > 0 && rawLine[0] === "@") {
        const tag: RegExpExecArray | null = CustomTagsPluginRenderer.__tagRexEx.exec(rawLine);
        if (tag) {
          tagName = tag[1].toLowerCase();

          if (tagName !== previousTagName) {
            this._processReadmeComment(processLines, newLines, readmeComment, pluginConverter, markdownPlugin, context);
            newLines = "";
            readmeComment = new Comment("", "");
            readmeComment.tags = [];
          }

          const tagContent: string = rawLine.substr(tagName.length + 1).trim();
          ((readmeComment && readmeComment.tags) || []).push(new CommentTag(tagName, undefined, tagContent));
          previousTagName = tagName;
          continue;
        }
      }
      if (rawLine.trim().length > 0) {
        if (tagName === null) {
          this._processReadmeComment(processLines, newLines, readmeComment, pluginConverter, markdownPlugin, context);
          readmeComment = undefined;
        }
        newLines = "";
        previousTagName = tagName;
      } else if (readmeComment) {
        newLines += "\n";
      }
      processLines.push(processLine);
    }

    const newContents: string = processLines.join("\n");
    return newContents;
  }

  private _processReadmeComment(processLines: string[], newLines: string, comment: Comment | undefined, pluginConverter: CustomTagsPluginConverter, markdownPlugin: MarkedPlugin, context: any): void {
    pluginConverter.resolveComment(comment);

    CustomTagsPluginRenderer.__processComment(comment, markdownPlugin, context);

    if (comment && typeof comment.text === "string") {
      processLines.push(comment.text, newLines);
    }
  }

  private static __processReflection(reflection: Reflection, markdownPlugin: MarkedPlugin, context: any): void {
    if (!reflection) {
      return;
    }
    reflection.traverse((r: Reflection, property: TraverseProperty): boolean | void => {
      CustomTagsPluginRenderer.__processReflection(r, markdownPlugin, context);
    });
    const comment: Comment | undefined = reflection ? reflection.comment : undefined;
    CustomTagsPluginRenderer.__processComment(comment, markdownPlugin, context);
  }

  private static __processComment(comment: Comment | undefined, markdownPlugin: MarkedPlugin, context: any): void {
    if (!comment || !comment.hasOwnProperty("matchingTags") || !Array.isArray((comment as any)["matchingTags"])) {
      return;
    }

    const matchingTags: IMatchingTag[][] = (comment as any)["matchingTags"];
    let tagGroup: IMatchingTag[] = [];

    for (let index: number = 0; index < matchingTags.length; index++) {
      tagGroup = matchingTags[index];

      const combineMode: TagCombineMode = tagGroup[0].config.combineMode;
      let text: string = tagGroup[0].config.template;
      let content: string = "";
      let innerContent: string = "";

      for (let part = 0; part < tagGroup.length; part++) {
        const item: IMatchingTag = tagGroup[part];
        const isListItem: boolean = (part > 0 && (combineMode === TagCombineMode.headerUl || combineMode === TagCombineMode.headerOl)) || (part >= 0 && (combineMode === TagCombineMode.ul || combineMode === TagCombineMode.ol));

        const itemText: string = CustomTagsPluginRenderer.__resolveText(item.tag.text, markdownPlugin, context);

        if (isListItem) {
          innerContent += "<li>" + itemText + "</li>";
        } else {
          content += itemText + "\n";
        }
      }

      if (innerContent.length > 0) {
        if (combineMode === TagCombineMode.ul || combineMode === TagCombineMode.headerUl) {
          content = content + "<ul>" + innerContent + "</ul>";
        } else if (combineMode === TagCombineMode.ol || combineMode === TagCombineMode.headerOl) {
          content = content + "<ol>" + innerContent + "</ol>";
        } else {
          content += "\n" + innerContent;
        }
      }

      if (text.indexOf("{content}") >= 0) {
        text = text.replace("{content}", content);
      } else {
        text += content;
      }

      comment.text += CustomTagsPluginRenderer.__resolveText(text, markdownPlugin, context);
    }

    delete (comment as any)["matchingTags"];
  }

  private static __resolveText(text: string, markdownPlugin: MarkedPlugin, context: any): string {
    let resolvedText = text;
    try {
      if (markdownPlugin) {
        resolvedText = markdownPlugin.parseMarkdown(text, context).trim();
        if (resolvedText.length > 7 && resolvedText.substr(0, 3) === "<p>" && resolvedText.substr(resolvedText.length - 4) === "</p>") {
          resolvedText = resolvedText.substr(3, resolvedText.length - 7);
        }
      }
    }
    catch (e) {
      e.message = `failed to parse text '${text}'. Error: ${e.message}`;
      throw e;
    }

    return resolvedText;
  }
}