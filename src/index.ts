import * as pluginConverter from "./CustomTagsPluginConverter";
import * as pluginRenderer from "./CustomTagsPluginRenderer";
import { PluginConstants } from "./PluginConstants";

export = (pluginHost: any) => {
  const app = pluginHost.owner;

  app.options.addDeclaration({ name: PluginConstants.ArgumentName });

  app.converter.addComponent(PluginConstants.ConverterPluginName, pluginConverter.CustomTagsPluginConverter);

  app.renderer.addComponent(PluginConstants.RendererPluginName, pluginRenderer.CustomTagsPluginRenderer);
};
