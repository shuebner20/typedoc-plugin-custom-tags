import { RendererComponent, Component } from "typedoc/dist/lib/output/components";
import { PluginConstants } from "./PluginConstants";
import { PageEvent } from "typedoc/dist/lib/output/events";
import { Reflection, ProjectReflection, DeclarationReflection, TraverseProperty } from "typedoc/dist/lib/models";
import { Comment } from "typedoc/dist/lib/models/comments";
import { IMatchingTag, TagCombineMode } from "./CustomTagsPluginConverter";
import { MarkedPlugin } from "typedoc/dist/lib/output/plugins";

@Component({ name: PluginConstants.RendererPluginName })
export class CustomTagsPluginRenderer extends RendererComponent {

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
    if (page.model instanceof ProjectReflection) {
      console.log("Beginn root page");
    } else if (page.model instanceof DeclarationReflection) {
      const markdownPlugin: MarkedPlugin = this.owner.owner.renderer.getComponent("marked") as MarkedPlugin;
      CustomTagsPluginRenderer.__processReflection(page.model, markdownPlugin, page);
    }
  }

  private static __processReflection(reflection: Reflection, markdownPlugin: MarkedPlugin, event: any): void {
    if (!reflection) {
      return;
    }
    reflection.traverse((r: Reflection, property: TraverseProperty): boolean | void => {
      CustomTagsPluginRenderer.__processReflection(r, markdownPlugin, event);
    });
    const comment: Comment | undefined = reflection ? reflection.comment : undefined;

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

        const itemText: string = CustomTagsPluginRenderer.__resolveText(item.tag.text, markdownPlugin, event);

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

      comment.text += CustomTagsPluginRenderer.__resolveText(text, markdownPlugin, event);
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