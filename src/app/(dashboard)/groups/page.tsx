"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { CardSkeleton, ButtonSpinner } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";

export default function GroupsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articleGroupId, setArticleGroupId] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { t } = useLanguage();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      return res.json();
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(t("groupCreated"));
      setShowForm(false);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(t("groupUpdated"));
      setEditingGroup(null);
      setShowForm(false);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(t("groupDeleted"));
    },
  });

  const articleMutation = useMutation({
    mutationFn: async ({
      groupId,
      action,
      article,
      articleId,
    }: {
      groupId: string;
      action: string;
      article?: any;
      articleId?: string;
    }) => {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, article, articleId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        // Handle Zod validation errors (array of errors)
        if (Array.isArray(errorData.error)) {
          const errorMessages = errorData.error.map((err: any) => 
            `${err.path?.join('.')}: ${err.message}`
          ).join(', ');
          throw new Error(errorMessages);
        }
        // Handle string error messages
        throw new Error(errorData.error || errorData.message || "Failed to process article");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (variables.action === "add-article") {
        toast.success(t("articleCreated"));
      } else if (variables.action === "update-article") {
        toast.success(t("articleUpdated"));
      } else if (variables.action === "delete-article") {
        toast.success(t("articleDeleted"));
      }
      setShowArticleForm(false);
      setArticleGroupId(null);
      setEditingArticle(null);
    },
    onError: (error: any) => {
      toast.error(error.message || t("error"));
    },
  });

  const handleGroupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      account: formData.get("account"),
      color: formData.get("color"),
    };

    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handleArticleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!articleGroupId) return;

    const formData = new FormData(e.currentTarget);
    
    // Helper to convert empty strings to undefined
    const getOptionalValue = (key: string) => {
      const value = formData.get(key) as string;
      return value && value.trim() !== "" ? value : undefined;
    };

    const article = {
      title: formData.get("title") as string,
      price: parseFloat(formData.get("price") as string),
      code: getOptionalValue("code"),
      internRef: getOptionalValue("internRef"),
      unite: getOptionalValue("unite"),
      description: getOptionalValue("description"),
      tax: getOptionalValue("tax"),
    };

    if (editingArticle) {
      articleMutation.mutate({
        groupId: articleGroupId,
        action: "update-article",
        article,
        articleId: editingArticle.id,
      });
    } else {
      articleMutation.mutate({ groupId: articleGroupId, action: "add-article", article });
    }
  };

  const handleCloseGroupModal = () => {
    setShowForm(false);
    setEditingGroup(null);
  };

  const handleCloseArticleModal = () => {
    setShowArticleForm(false);
    setArticleGroupId(null);
    setEditingArticle(null);
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("groups")} & {t("articles")}</h1>
          <p className="text-sm text-muted-foreground">{t("managePersonalInfo")}</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> {t("newGroup")}
        </Button>
      </div>

      {/* Group Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseGroupModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? t("editGroup") : t("newGroup")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGroupSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("groupName")} *</Label>
                <Input id="name" name="name" defaultValue={editingGroup?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account">{t("accountCode")}</Label>
                <Input id="account" name="account" defaultValue={editingGroup?.account} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">{t("color")}</Label>
                <Input id="color" name="color" type="color" defaultValue={editingGroup?.color || "#3b82f6"} className="h-10 w-full" />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseGroupModal} className="w-full sm:w-auto">
                {t("cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                {editingGroup ? t("update") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Article Form Modal */}
      <Dialog open={showArticleForm} onOpenChange={(open) => !open && handleCloseArticleModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? t("editArticle") : t("newArticle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleArticleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2 md:col-span-1">
                <Label>{t("articleTitle")} *</Label>
                <Input name="title" defaultValue={editingArticle?.title} required />
              </div>
              <div className="space-y-2">
                <Label>{t("price")} *</Label>
                <Input name="price" type="number" step="0.01" defaultValue={editingArticle?.price} required />
              </div>
              <div className="space-y-2">
                <Label>{t("unit")}</Label>
                <Input name="unite" defaultValue={editingArticle?.unite} />
              </div>
              <div className="space-y-2">
                <Label>{t("articleCode")}</Label>
                <Input name="code" defaultValue={editingArticle?.code} />
              </div>
              <div className="space-y-2">
                <Label>{t("internalRef")}</Label>
                <Input name="internRef" defaultValue={editingArticle?.internRef} />
              </div>
              <div className="space-y-2">
                <Label>{t("tax")} (%)</Label>
                <Input name="tax" defaultValue={editingArticle?.tax || "20"} />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseArticleModal} className="w-full sm:w-auto">
                {t("cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                {editingArticle ? t("update") : t("addItem")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Groups List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            {t("noGroupFound")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group: any) => (
            <Card key={group.id}>
              <CardHeader className="py-3 sm:py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1 min-w-0" onClick={() => toggleGroup(group.id)}>
                    {expandedGroups.has(group.id) ? (
                      <ChevronDown className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 flex-shrink-0" />
                    )}
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: group.color || "#3b82f6" }} />
                    <span className="font-medium truncate">{group.name}</span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ({group.articles?.length || 0} {t("articles")})
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setArticleGroupId(group.id);
                        setEditingArticle(null);
                        setShowArticleForm(true);
                      }}
                      className="flex-1 sm:flex-initial"
                    >
                      <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t("article")}</span><span className="sm:hidden">Article</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingGroup(group);
                        setShowForm(true);
                      }}
                      className="flex-shrink-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (await confirm({ title: t("deleteGroup"), message: t("deleteGroupConfirm"), type: "danger" })) {
                          deleteGroupMutation.mutate(group.id);
                        }
                      }}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedGroups.has(group.id) && (
                <CardContent className="p-3 sm:p-6">
                  {/* Articles Table */}
                  {group.articles?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 sm:px-4 whitespace-nowrap min-w-[100px]">{t("articleTitle")}</th>
                            <th className="text-left py-2 px-2 sm:px-4 whitespace-nowrap hidden sm:table-cell">{t("articleCode")}</th>
                            <th className="text-left py-2 px-2 sm:px-4 whitespace-nowrap hidden md:table-cell">{t("unit")}</th>
                            <th className="text-right py-2 px-2 sm:px-4 whitespace-nowrap">{t("price")}</th>
                            <th className="text-right py-2 px-2 sm:px-4 whitespace-nowrap hidden sm:table-cell">{t("tax")}</th>
                            <th className="text-right py-2 px-2 sm:px-4 whitespace-nowrap">{t("actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.articles.map((article: any) => (
                            <tr key={article.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <td className="py-2 px-2 sm:px-4 truncate max-w-[150px]" title={article.title}>{article.title}</td>
                              <td className="py-2 px-2 sm:px-4 hidden sm:table-cell">{article.code || "-"}</td>
                              <td className="py-2 px-2 sm:px-4 hidden md:table-cell">{article.unite || "-"}</td>
                              <td className="py-2 px-2 sm:px-4 text-right whitespace-nowrap">{formatCurrency(article.price)}</td>
                              <td className="py-2 px-2 sm:px-4 text-right hidden sm:table-cell">{article.tax || 0}%</td>
                              <td className="py-2 px-2 sm:px-4">
                                <div className="flex justify-end gap-1 sm:gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingArticle(article);
                                      setArticleGroupId(group.id);
                                      setShowArticleForm(true);
                                    }}
                                    className="h-8 w-8"
                                  >
                                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                      if (await confirm({ title: t("deleteArticle"), message: t("deleteArticleConfirm"), type: "danger" })) {
                                        articleMutation.mutate({
                                          groupId: group.id,
                                          action: "delete-article",
                                          articleId: article.id,
                                        });
                                      }
                                    }}
                                    className="h-8 w-8"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {t("noDataFound")}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
