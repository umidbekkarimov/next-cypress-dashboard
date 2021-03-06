import {
  createServerSideProps,
  getRequestBody,
  redirectToSignIn,
} from "@/app/data/ServerSideProps";
import { prisma } from "@/server/db";
import { getCsrfToken } from "next-auth/client";

export const getServerSideProps = createServerSideProps<
  unknown,
  { projectId: string }
>(async ({ userId }, context) => {
  const projectId = context.params?.projectId;

  if (!projectId) {
    return { notFound: true };
  }

  const csrfToken = await getCsrfToken(context);

  if (!csrfToken) {
    return redirectToSignIn(context);
  }

  if (context.req.method === "POST") {
    const body = await getRequestBody(context);

    if (body.get("csrfToken") !== csrfToken) {
      return redirectToSignIn(context);
    }

    await prisma.projectSecrets.createMany({
      data: { projectId },
      skipDuplicates: true,
    });
  }

  return {
    redirect: {
      permanent: false,
      destination: context.req.headers.referer || `/p/${projectId}/settings`,
    },
  };
});

export default function GenerateProjectSecrets(): null {
  return null;
}
