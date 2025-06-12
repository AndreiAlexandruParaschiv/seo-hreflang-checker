# seo-hreflang-checker

## About

This tool checks web pages for common hreflang tag implementation issues. It uses Puppeteer to load pages and analyze the hreflang tags, canonical tags, and other relevant HTML elements.

## Prerequisites

- Node.js must be installed on your system. npm (Node Package Manager) is included with Node.js by default. You can download and install Node.js from [https://nodejs.org/](https://nodejs.org/).

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AndreiAlexandruParaschiv/seo-hreflang-checker.git
    cd seo-hreflang-checker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

1.  Before running the checker, you need to specify the URLs you want to analyze.
2.  Open the `config.json` file in the root directory.
3.  Modify the `urls` array to include the list of URLs you want to check. For example:
    ```json
    {
      "urls": [
        "https://www.example.com/page1",
        "https://www.example.com/page2",
        "https://www.example.com/page3"
      ]
    }
    ```

## Running the Checker

To run the hreflang checker, execute the following command in your terminal from the root directory of the project:

```bash
node hreflang-checker.js
```

The script will iterate through the URLs specified in `config.json`, perform the checks, and log its progress in the console.

## Output

The results of the hreflang checks are saved in a CSV file in the `results` directory. The filename will be timestamped, for example: `hreflang-results-YYYY-MM-DDTHH-MM-SS-MSZ.csv`.

The CSV file contains the following columns:

-   **Page URL**: The URL of the page that was checked.
-   **hreflang**: The value of the `hreflang` attribute.
-   **href**: The value of the `href` attribute for the hreflang tag.
-   **inHead**: Indicates if the hreflang tag is within the `<head>` section of the HTML ('OK' or 'FAIL').
-   **inHeadReason**: Reason if `inHead` is 'FAIL'.
-   **isSelfReferencing**: Indicates if the hreflang tag points to the Page URL ('OK' or 'FAIL').
-   **isSelfReferencingReason**: Reason if `isSelfReferencing` is 'FAIL'.
-   **isAbsolute**: Indicates if the `href` attribute is an absolute URL ('OK' or 'FAIL').
-   **isAbsoluteReason**: Reason if `isAbsolute` is 'FAIL'.
-   **matchesCanonical**: Indicates if the `href` attribute matches the page's canonical URL ('OK' or 'FAIL').
-   **matchesCanonicalReason**: Reason if `matchesCanonical` is 'FAIL'.
-   **htmlLang**: The value of the `lang` attribute on the `<html>` tag.
-   **canonicalMismatch**: Indicates if the page's canonical URL matches the Page URL ('OK' or 'FAIL').
-   **canonicalMismatchReason**: Reason if `canonicalMismatch` is 'FAIL'.
-   **ogUrlMismatch**: Indicates if the `og:url` meta tag content matches the Page URL ('OK' or 'FAIL').
-   **ogUrlMismatchReason**: Reason if `ogUrlMismatch` is 'FAIL'.
-   **langMismatch**: Indicates if the `hreflang` attribute value is compatible with the `htmlLang` value ('OK' or 'FAIL').
-   **langMismatchReason**: Reason if `langMismatch` is 'FAIL'.
-   **reasons**: A semicolon-separated summary of all 'FAIL' reasons for the specific hreflang entry.
