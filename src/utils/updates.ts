export const inAppUpdates: boolean = true;
export const downloadUrl: string = `https://github.com/${process.env.EXPO_PUBLIC_GITHUB_REPO}/releases/latest`;

export async function getLatestVersion(): Promise<string> {
    const response = await fetch(`https://api.github.com/repos/${process.env.EXPO_PUBLIC_GITHUB_REPO}/releases/latest`, {
        method: "GET",
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });
    if (!response.ok) {
        throw new Error("Response status is not ok.");
    }

    const json = await response.json();
    if (!json || !json.tag_name) {
        throw new Error("json or tag_name is falsy.");
    }
    if (typeof json.tag_name !== "string") {
        throw new Error("tag_name is not a string.");
    }

    return json.tag_name;
}