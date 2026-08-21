#!/usr/bin/env bash
# Fail before a version bump if this token cannot open the release PR.
#
# GITHUB_TOKEN needs a repository (or org) setting that is off by default:
# Settings → Actions → General → "Allow GitHub Actions to create and approve
# pull requests". A RELEASE_PAT secret bypasses that restriction.

set -euo pipefail

repo="${GITHUB_REPOSITORY:?}"
settings_url="https://github.com/${repo}/settings/actions"

if [ "${HAS_RELEASE_PAT:-false}" = "true" ]; then
    echo "RELEASE_PAT is set; the release PR will be opened with that token."
    exit 0
fi

echo "No RELEASE_PAT secret. Opening the release PR will use GITHUB_TOKEN."
echo "That is refused unless this is enabled: ${settings_url}"

json="$(gh api "repos/${repo}/actions/permissions/workflow" 2>/dev/null || true)"
if [ -z "${json}" ]; then
    echo "Could not read workflow permissions with this token; will try to open the PR anyway."
    exit 0
fi

allowed="$(printf '%s' "${json}" | jq -r '.can_approve_pull_request_reviews')"
if [ "${allowed}" = "true" ]; then
    echo "GITHUB_TOKEN is allowed to create pull requests."
    exit 0
fi

{
    echo "GitHub Actions is not permitted to create pull requests with GITHUB_TOKEN."
    echo
    echo "Enable: Settings → Actions → General → Workflow permissions →"
    echo "\"Allow GitHub Actions to create and approve pull requests\""
    echo "${settings_url}"
    echo
    echo "If the checkbox is greyed out, turn it on at the org or enterprise first."
    echo
    echo "Or add a RELEASE_PAT secret (contents + pull requests: write). A PAT is"
    echo "also what later \`gh pr merge --admin\` needs if main is protected."
} >&2
echo "::error::Enable Actions pull-request creation or add the RELEASE_PAT secret. ${settings_url}"
exit 1
