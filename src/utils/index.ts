/**
 * Creates a URL for a page route.
 * Preserves the original case of the page name to match route definitions.
 * Only replaces spaces with hyphens for URL compatibility.
 * 
 * @param pageName - The name of the page (e.g., 'ProjectDetails', 'MyTasks')
 * @returns The URL path (e.g., '/ProjectDetails', '/MyTasks')
 */
export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}