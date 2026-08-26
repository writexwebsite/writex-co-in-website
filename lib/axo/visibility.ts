const AXO_EXCLUDED_ROUTE_PREFIXES = ["/admin", "/client", "/employee"] as const;

export function isAxoRouteEligible(pathname: string) {
  return !AXO_EXCLUDED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}-`)
  );
}
