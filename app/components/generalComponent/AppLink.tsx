"use client";

import MuiLink, { type LinkProps as MuiLinkProps } from "@mui/material/Link";
import NextLink from "next/link";
import { forwardRef } from "react";

/**
 * Thin wrapper combining MUI Link with Next.js Link.
 * Use this instead of `<MuiLink component={Link}>` so the parent
 * page can remain a server component (passing functions as props
 * to client components isn't allowed from server components).
 */
const AppLink = forwardRef<HTMLAnchorElement, MuiLinkProps>(
  function AppLink(props, ref) {
    return <MuiLink ref={ref} component={NextLink} {...props} />;
  },
);

export default AppLink;
