import { redirect } from "next/navigation";

/**
 * /dashboard has no content of its own — send visitors on to the overview.
 * This previously rendered the layout component a second time inside the real
 * layout, drawing a duplicate nav shell; harmless while the route was the
 * rarely-visited /dashboard/seller, but /dashboard is now a likely entry point.
 */
const Dashboard = () => {
  redirect("/dashboard/overview");
};

export default Dashboard;
