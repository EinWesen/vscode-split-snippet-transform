# Split Snippet Transform - A Visual Studio Code extension

This is just a small plugin mainly for my personal use.

It allowes me to apply some kind of snippet-like template to structured data, effectively giving the opportunity of filling multiple values at predifend places in a text.

# Features
* Insert the current contents of the clipboard as a snippet
* Insert the content of an open file as snippet
* Apply a snippet to a selection, which will be split by a delimiter, and each split is made available as variable in the snippet
   * This feature can be used with one of the feature mentioned above 

# Usage of structured data

Create a snippet / template like

    Dear ${TM_SELECTED_TEXT[0]} ${TM_SELECTED_TEXT[1]}
    We have registered your birth year as ${TM_SELECTED_TEXT[2]}.
    Sincerely,
    Name

Copy it to the clipboard and create your structured data like

    Sir|Newton|1642
    Madam|Curie|1897

Select each line with one individual cursor and apply the snippet with the command in the command palette.

# How it works
Before actually applying a the choosen snippet, the snippet Text is parsed itself for the special split variables, which in turn get replaced by appropriate replacement transforms supported by VSCode. Which enables full snippet functionality -  woohooo.

# Fallback option / How it worked before
Before Using the variable transformations, the extension worked differently by doing the neccessary replacemenmts itself. This behaviour can still be reproduced by setting "einwesen.split-snippet-transform.useNativeTransform" to "false". In that case the extension like this, if there is more than one selection:

* Get the snippet contents
* Loop through all selections
    * Split the selection by a delimiter and for every found split replace the corresponding var name in teh string
    * Replace the selection with the result

While this worked well (for me ;]), it also has the following caveats:
* The usual variables available in snippets can not be used
* As we don't really insert a snippet, all functionality based on it like placeholders is not available
* I don't know how this performs on large datasets
