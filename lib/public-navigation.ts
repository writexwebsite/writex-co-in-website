export type PublicNavigationItem = {
  label: string;
  href: string;
};

const primaryPublicNavigation: PublicNavigationItem[] = [
  { label: "About Us", href: "/about-us" },
  { label: "Trust Centre\u2122", href: "/trust-centre" },
  { label: "Careers", href: "/careers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" }
];

const companyFooterNavigation: PublicNavigationItem[] = [
  { label: "About Us", href: "/about-us" },
  { label: "Trust Centre\u2122", href: "/trust-centre" },
  { label: "Careers", href: "/careers" },
  { label: "Contact Us", href: "/contact" },
  { label: "Client Login", href: "/client-login" },
  { label: "Employee Login", href: "/employee-login" }
];

function filterCareersLink(items: PublicNavigationItem[], showCareers: boolean) {
  return showCareers ? items : items.filter((item) => item.href !== "/careers");
}

export function getPrimaryPublicNavigation({
  includeHome = false,
  showCareers
}: {
  includeHome?: boolean;
  showCareers: boolean;
}) {
  const items = filterCareersLink(primaryPublicNavigation, showCareers);

  return includeHome ? [{ label: "Home", href: "/" }, ...items] : items;
}

export function getCompanyFooterNavigation(showCareers: boolean) {
  return filterCareersLink(companyFooterNavigation, showCareers);
}

export function isPublicNavigationActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
