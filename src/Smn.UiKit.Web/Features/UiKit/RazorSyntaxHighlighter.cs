using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;

namespace Smn.UiKit.Web.Features.UiKit;

/// <summary>Turns a Razor/HTML snippet into markup with per-token highlighting.</summary>
public static class RazorSyntaxHighlighter
{
    private enum State
    {
        Text,
        TagName,
        InsideTag,
        AttributeName,
        AttributeValue,
    }

    /// <summary>Highlights the snippet, encoding every value it emits.</summary>
    public static IHtmlContent Highlight(string snippet)
    {
        ArgumentNullException.ThrowIfNull(snippet);

        var builder = new StringBuilder(snippet.Length * 2);
        var buffer = new StringBuilder();
        var state = State.Text;
        var quote = '\0';

        foreach (var character in snippet)
        {
            switch (state)
            {
                case State.Text when character == '<':
                    Flush(builder, buffer, null);
                    buffer.Append(character);
                    state = State.TagName;
                    break;

                case State.TagName when character is ' ' or '>' or '\n':
                    Flush(builder, buffer, "token-tag");
                    buffer.Append(character);
                    Flush(builder, buffer, "token-punctuation");
                    state = character == '>' ? State.Text : State.InsideTag;
                    break;

                case State.InsideTag when character == '>':
                    Flush(builder, buffer, "token-attribute");
                    buffer.Append(character);
                    Flush(builder, buffer, "token-punctuation");
                    state = State.Text;
                    break;

                case State.InsideTag when character == '=':
                    Flush(builder, buffer, "token-attribute");
                    buffer.Append(character);
                    Flush(builder, buffer, "token-punctuation");
                    state = State.AttributeValue;
                    break;

                case State.InsideTag when character == ' ':
                    Flush(builder, buffer, "token-attribute");
                    buffer.Append(character);
                    Flush(builder, buffer, null);
                    break;

                case State.AttributeValue when quote == '\0' && character is '"' or '\'':
                    quote = character;
                    buffer.Append(character);
                    break;

                case State.AttributeValue when quote != '\0' && character == quote:
                    buffer.Append(character);
                    Flush(builder, buffer, "token-value");
                    quote = '\0';
                    state = State.InsideTag;
                    break;

                case State.AttributeValue when quote == '\0' && character is ' ' or '>':
                    Flush(builder, buffer, "token-value");
                    buffer.Append(character);
                    Flush(builder, buffer, "token-punctuation");
                    state = character == '>' ? State.Text : State.InsideTag;
                    break;

                default:
                    buffer.Append(character);
                    break;
            }
        }

        Flush(builder, buffer, state == State.Text ? null : "token-tag");

        return new HtmlString(builder.ToString());
    }

    private static void Flush(StringBuilder builder, StringBuilder buffer, string? cssClass)
    {
        if (buffer.Length == 0)
        {
            return;
        }

        var encoded = HtmlEncoder.Default.Encode(buffer.ToString());

        if (cssClass is null)
        {
            builder.Append(encoded);
        }
        else
        {
            builder.Append("<span class=\"").Append(cssClass).Append("\">")
                .Append(encoded)
                .Append("</span>");
        }

        buffer.Clear();
    }
}
