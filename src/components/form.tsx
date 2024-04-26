import { DatePicker } from "@/components/date-picker";
import HelpDialog from "@/components/help-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/user-context";
import exportToExcel from "@/helpers/export";
import { zodResolver } from "@hookform/resolvers/zod";
import Clockify from "clockify-ts";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  resource: z.string().max(3),
  callNo: z.string().max(8),
  date: z.date(),
  includeProject: z.boolean(),
});

const TimesheetForm = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { user, setUser } = useUser();
  const { userId, workspaceId, apiKey } = user;
  const clockify = new Clockify(apiKey ?? "");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resource: user.resource,
      callNo: user.callNo,
      date: undefined,
      includeProject: user.prefersProjectName || false,
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsExporting(true);

    try {
      if (userId && workspaceId) {
        const [timeEntries, projects] = await Promise.all([
          clockify.workspace
            .withId(workspaceId)
            .users.withId(userId)
            .timeEntries.get({
              "get-week-before": format(
                new Date(data.date),
                "yyyy-MM-dd'T'23:59:59.999'Z'",
              ),
            }),
          clockify.workspace.withId(workspaceId).projects.get(),
        ]);

        setUser((prev) => ({
          ...prev,
          resource: data.resource,
          callNo: data.callNo,
          prefersProjectName: data.includeProject,
          projects: projects,
        }));

        await exportToExcel(
          data.resource,
          data.callNo,
          timeEntries,
          data.date,
          data.includeProject,
        );

        setIsExporting(false);
      }
    } catch (error) {
      console.error("Error fetching time entries:", error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="resource"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resource</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="callNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Call No</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Week Ending</FormLabel>
              <FormControl>
                <DatePicker field={field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="includeProject"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Include project name</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit">{isExporting ? "Exporting..." : "Export"}</Button>
        <HelpDialog />
      </form>
    </Form>
  );
};

export default TimesheetForm;
