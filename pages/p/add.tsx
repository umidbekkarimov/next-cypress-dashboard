import {
  createServerSideProps,
  getRequestBody,
  redirectToSignIn,
} from "@/app/data/ServerSideProps";
import { prisma } from "@/server/db";
import { GITHUB_CLIENT_SLUG } from "@/server/env";
import { verifyGitHubRepoAccess } from "@/server/GitHubClient";
import {
  AppErrorCode,
  extractErrorCode,
  formatErrorCode,
  isGitHubIntegrationError,
} from "@/shared/AppError";
import { parseGitUrl } from "@/shared/GitUrl";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Link,
  TextField,
} from "@material-ui/core";
import { getCsrfToken } from "next-auth/client";
import NextLink from "next/link";
import { useRouter } from "next/router";
import React, { ReactElement } from "react";

interface AddProjectPageProps {
  csrfToken: string;
  errorCode?: AppErrorCode;
  gitHubClientSlug: string;
}

export const getServerSideProps = createServerSideProps<AddProjectPageProps>(
  async ({ userId }, context) => {
    const csrfToken = await getCsrfToken(context);

    if (!csrfToken) {
      return redirectToSignIn(context);
    }

    const props: AddProjectPageProps = {
      csrfToken,
      gitHubClientSlug: GITHUB_CLIENT_SLUG,
    };

    if (context.req.method === "POST") {
      const body = await getRequestBody(context);
      const repoUrl = body.get("repo");

      if (!repoUrl) {
        return { props: { ...props, errorCode: "BAD_REQUEST" } };
      }

      if (body.get("csrfToken") !== csrfToken) {
        return redirectToSignIn(context);
      }

      try {
        const [providerId, org, repo] = parseGitUrl(repoUrl);

        await verifyGitHubRepoAccess(userId, org, repo);

        const project = await prisma.project.upsert({
          select: { id: true },
          update: { users: { connect: { id: userId } } },
          where: { org_repo_providerId: { org, repo, providerId } },
          create: {
            org,
            repo,
            providerId,
            secrets: { create: {} },
            users: { connect: { id: userId } },
          },
        });

        return {
          redirect: {
            permanent: false,
            destination: `/p/${project.id}`,
          },
        };
      } catch (error: unknown) {
        const errorCode = extractErrorCode(error);

        if (isGitHubIntegrationError(errorCode)) {
          return redirectToSignIn(context);
        }

        return { props: { ...props, errorCode } };
      }
    }

    return { props };
  }
);

export default function AddProjectPage({
  csrfToken,
  errorCode,
  gitHubClientSlug,
}: AddProjectPageProps): ReactElement {
  const router = useRouter();

  return (
    <Dialog open={true} fullWidth={true} maxWidth="xs">
      {errorCode ? (
        errorCode === "GITHUB_REPO_NOT_FOUND" ? (
          <Alert
            severity="error"
            action={
              <NextLink replace={true} passHref={true} href="/p/add">
                <Button color="inherit">Close</Button>
              </NextLink>
            }
          >
            Repository not found, did you grant access for the{" "}
            <Link
              color="inherit"
              underline="always"
              href={`https://github.com/apps/${gitHubClientSlug}/installations/new`}
            >
              {gitHubClientSlug}
            </Link>{" "}
            app?
          </Alert>
        ) : (
          <Alert
            severity="error"
            action={
              <NextLink replace={true} passHref={true} href="/p/add">
                <Button color="inherit">Close</Button>
              </NextLink>
            }
          >
            {formatErrorCode(errorCode)}
          </Alert>
        )
      ) : (
        <form method="POST">
          <input type="hidden" name="csrfToken" value={csrfToken} />

          <DialogContent>
            <TextField
              name="repo"
              label="Repo URL"
              required={true}
              fullWidth={true}
              autoFocus={true}
              placeholder="https://github.com/umidbekk/next-cypress-dashboard"
              defaultValue={
                typeof router.query.repo == "string" ? router.query.repo : ""
              }
            />
          </DialogContent>

          <DialogActions>
            <NextLink replace={true} passHref={true} href="/p">
              <Button>Dismiss</Button>
            </NextLink>

            <Button>Confirm</Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}
