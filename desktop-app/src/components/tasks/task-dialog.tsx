import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { differenceInDays } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { Task } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const taskSchema = z.object({
  numero: z.coerce.number().optional(),
  activite: z.string().min(1, "Activité requise"),
  tache: z.string().min(1, "Tâche requise"),
  description: z.string().optional(),
  source: z.string().optional(),
  nature: z.string().optional(),
  extrantAttendu: z.string().optional(),
  iov: z.string().optional(),
  responsable: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  duree: z.coerce.number().optional(),
  priorite: z.string().optional(),
  etatAvancement: z.string(),
  extrantsObtenus: z.string().optional(),
  livrablesFournis: z.string().optional(),
  observations: z.string().optional(),
  etat: z.string().nullable().optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  onSave: (t: Task) => void;
  taskCount: number;
}

export function TaskDialog({ open, onOpenChange, task, onSave, taskCount }: TaskDialogProps) {
  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      etatAvancement: "Non démarré",
      priorite: "Moyen",
      activite: "",
      tache: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (task) {
        form.reset({
          numero: task.numero,
          activite: task.activite,
          tache: task.tache,
          description: task.description,
          source: task.source,
          nature: task.nature,
          extrantAttendu: task.extrantAttendu,
          iov: task.iov,
          responsable: task.responsable,
          dateDebut: task.dateDebut,
          dateFin: task.dateFin,
          duree: task.duree,
          priorite: task.priorite,
          etatAvancement: task.etatAvancement,
          extrantsObtenus: task.extrantsObtenus,
          livrablesFournis: task.livrablesFournis,
          observations: task.observations,
          etat: task.etat,
        });
      } else {
        form.reset({
          numero: taskCount + 1,
          activite: "",
          tache: "",
          description: "",
          source: "",
          nature: "",
          extrantAttendu: "",
          iov: "",
          responsable: "",
          dateDebut: "",
          dateFin: "",
          priorite: "Moyen",
          etatAvancement: "Non démarré",
          extrantsObtenus: "",
          livrablesFournis: "",
          observations: "",
          etat: null,
        });
      }
    }
  }, [open, task]);

  const onSubmit = (values: TaskForm) => {
    let duree = values.duree;
    if (!duree && values.dateDebut && values.dateFin) {
      try {
        duree = Math.abs(differenceInDays(parseISO(values.dateFin), parseISO(values.dateDebut)));
      } catch { duree = 0; }
    }
    const saved: Task = {
      id: task?.id ?? uuidv4(),
      numero: values.numero ?? taskCount + 1,
      activite: values.activite,
      tache: values.tache,
      description: values.description ?? "",
      source: values.source ?? "",
      nature: values.nature ?? "",
      extrantAttendu: values.extrantAttendu ?? "",
      iov: values.iov ?? "",
      responsable: values.responsable ?? "",
      dateDebut: values.dateDebut ?? "",
      dateFin: values.dateFin ?? "",
      duree: duree ?? 0,
      priorite: values.priorite ?? "Moyen",
      etatAvancement: values.etatAvancement,
      extrantsObtenus: values.extrantsObtenus ?? "",
      livrablesFournis: values.livrablesFournis ?? "",
      observations: values.observations ?? "",
      etat: values.etat ?? null,
    };
    onSave(saved);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 shrink-0">
          <DialogTitle className="text-lg font-bold">{task ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1 px-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-4 bg-background/50">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="planning">Planning</TabsTrigger>
                  <TabsTrigger value="suivi">Suivi</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="numero" render={({ field }) => (
                      <FormItem>
                        <FormLabel>N°</FormLabel>
                        <FormControl><Input type="number" {...field} data-testid="input-task-numero" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="priorite" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priorité</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-task-priorite"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Élevé">Élevé</SelectItem>
                            <SelectItem value="Moyen">Moyen</SelectItem>
                            <SelectItem value="Faible">Faible</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="activite" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activité *</FormLabel>
                      <FormControl><Input {...field} placeholder="Nom de l'activité ou phase" data-testid="input-task-activite" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tache" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tâche *</FormLabel>
                      <FormControl><Input {...field} placeholder="Nom de la tâche" data-testid="input-task-tache" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea {...field} rows={3} placeholder="Description détaillée" data-testid="input-task-description" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="responsable" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsable</FormLabel>
                        <FormControl><Input {...field} placeholder="Nom du responsable" data-testid="input-task-responsable" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="source" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <FormControl><Input {...field} placeholder="Source de la tâche" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="nature" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nature</FormLabel>
                      <FormControl><Input {...field} placeholder="Nature de la tâche" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="planning" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="dateDebut" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de début</FormLabel>
                        <FormControl><Input type="date" {...field} data-testid="input-task-date-debut" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dateFin" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de fin</FormLabel>
                        <FormControl><Input type="date" {...field} data-testid="input-task-date-fin" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="etatAvancement" render={({ field }) => (
                    <FormItem>
                      <FormLabel>État d'avancement</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-task-etat"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Non démarré">Non démarré</SelectItem>
                          <SelectItem value="En cours">En cours</SelectItem>
                          <SelectItem value="Terminé">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="extrantAttendu" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extrant attendu</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder="Résultat attendu" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="iov" render={({ field }) => (
                    <FormItem>
                      <FormLabel>IOV (Indicateur Objectivement Vérifiable)</FormLabel>
                      <FormControl><Input {...field} placeholder="Indicateur de vérification" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="suivi" className="space-y-4">
                  <FormField control={form.control} name="extrantsObtenus" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extrants obtenus à date</FormLabel>
                      <FormControl><Textarea {...field} rows={3} placeholder="Résultats obtenus jusqu'à présent" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="livrablesFournis" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Livrables fournis</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder="Livrables déjà fournis" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="observations" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observations</FormLabel>
                      <FormControl><Textarea {...field} rows={3} placeholder="Notes et observations" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>
              </Tabs>
            </ScrollArea>

            <DialogFooter className="mt-0 shrink-0 border-t border-border px-6 py-4 bg-card">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" data-testid="button-save-task">{task ? "Enregistrer" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
