# TypeDoc Plugin Custom Tags

[typedoc](https://github.com/TypeStrong/typedoc) plugin to define how specific custom @tags are rendered.

This plugin is a fork of [typedoc-plugin-example-tag](https://github.com/ardalanamini/typedoc-plugin-example-tag) by [Ardalan Amini](https://github.com/ardalanamini).

## Installation

    npm install --save-dev typedoc-plugin-custom-tags
    
typedoc will automatically detect and load the plugin from `node_modules`.

## Usage

The configuration of this plugin is described in a JSON file.

    typedoc --custom-tags-config typedoc-tags-config.json
    
The `typedoc-tags-config.json` structure is either a single configuration object ... 

  
    {} extends ICustomTagDeclaration

... or a collection of configuration objects two define more than one custom tag ... 

  
    [
      {} extends ICustomTagDeclaration,     
      {} extends ICustomTagDeclaration,     
      ...
    ]

Where the `ICustomTagDeclaration` interface has the following declaration:

  
    interface ICustomTagDeclaration {
      "tagName": string;
      "template": string;
      "combine"?: "none" | "header-ul" | "header-ol" | "ul" | "ol" | "block";
      "hidden"?: boolean;
    }

`tagName` is the expected name of the custom tag. This is the name you will use in your documentation as `@tagName`.

`template` is the markdown-formatted template for the content of the tag. You can use the `{content}` placeholder within the template to specify where the @tag's content is placed. If this placeholder is emitted, the @tag's content is appended to the end of the template.

You can optionally specify how consecutive tags with the same tag name are rendered using the optional `combine` property.

If you (temporarily) want to exclude a specific tag, you can set the optional `hidden` property to `true`.

### README Support

If you're using a `README.md` file as homepage of your document, this plugin will also parse this file for occurrences of @tags. Only @tags placed at the start of a line will be processed.

## Examples

### Simple Example

Consider the following example for the config JSON file:

  
    [
      {
        "tagName": "myusage",
        "template": "\n###### Usage \n\n{content}\n"
      },
      {
        "tagName": "myvalueconstraint",
        "template": "\n{content}\n",
        "combine": "ul"
      },
    ]

And the following documentation in one of your .ts source file:

    /**
     * Brief description of IMyInterface.
     * 
     * @myusage This is an abstract interface. Use [[IMyInterface]] instead.
     **/
    export interface IMyInterfaceBase
    {
      /**
       * myProperty is described here.
       * 
       * @myvaluecontstraint This value is required.
       * @myvaluecontstraint This value must not be empty.
       * @myvaluecontstraint The value must start with a uppercase or lowercase letter (a-z, A-Z).
       * @myvaluecontstraint The value length must not be greater than 25.
       **/
      myProperty: string;
    }

This typedoc plugin will render the following documentation nodes.

For interface `IMyInterfaceBase`:

    Brief description of IMyInterface.

    ###### Usage 

    This is an abstract interface. Use [[IMyInterface]] instead.

And for property `myProperty`:

    myProperty is described here.

    * This value is required.
    * This value must not be empty.
    * The value must start with a uppercase or lowercase letter (a-z, A-Z).
    * The value length must not be greater than 25.

Markdown parser is used for every single tag value as well as for the every single template.

### Themed Example

When you use this theme you probably also want to use custom CSS rules and assets. According to markdown specification you can also place HTML code. The following example configuration shows how to define a tag rendered as box:

    {
      "tagName": "warning",
      "template": "<div class='box warning'>\n<i class='fas fa-exclamation-circle'></i>{content}</div>\n"
    }

To add your own styles or assets you need to extend the typedoc theme (e.g. to add additional CSS rules). Please refer to [typedoc's official documentation about custom themes](https://typedoc.org/guides/themes/) for more information.

Assuming you have created your own template with a CSS file, these rules are added to the CSS file:

    div.box {
      padding: 0.5em 1em;
      border: 2px solid transparent;
      border-left-width: 3em;
      margin-bottom: 1em;
    }

    div.box > i {
      display: inline-block;
      margin-left: -3em;
      margin-right: 2em;
      color: #ffffff;
    }

    div.box > ul,
    div.box > ol {
      margin: 0;
      display: inline-grid;
    }

    div.warning {
      border-color: #dddd00;
      background: #dddd0080;
    }

In the layout template of your theme (`./layouts/default.hbs`) you need to add a link to your stylesheet as well as a link to Font Awesome:

    <!doctype html>
    <html class="default no-js">
    <head>
        [...]

        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.9.0/css/solid.min.css" integrity="sha256-3FfMfpeajSEpxWZTFowWZPTv7k3GEu7w4rQv49EWsEY=" crossorigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.9.0/css/fontawesome.min.css" integrity="sha256-AaQqnjfGDRZd/lUp0Dvy7URGOyRsh8g9JdWUkyYxNfI=" crossorigin="anonymous" />

        <link rel="stylesheet" href="{{relativeURL "assets/css/main.css"}}">
        <link rel="stylesheet" href="{{relativeURL "assets/css/termingo.css"}}">
    </head>
    [...]

In your documentation, just add a `@warning` tag to render the box:

    /**
     * This is my interface.
     *
     * @warning This interface is obsolete. Please use [[IMyNewInterface]] instead.
     **/
    export interface IMyInterface {
      [...]
    }

This will result in something like this:

![themed-example](https://github.com/shuebner20/typedoc-plugin-custom-tags/raw/master/assets/themed-example.png "Themed Example")

If you find this typedoc plugin useful, you may also be interested in [typedoc-plugin-devops-sourcefile](https://github.com/shuebner20/typedoc-plugin-devops-sourcefile).