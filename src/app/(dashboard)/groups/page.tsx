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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("groups")} & {t("articles")}</h1>
          <p className="text-muted-foreground">{t("managePersonalInfo")}</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
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
                <Input id="color" name="color" type="color" defaultValue={editingGroup?.color || "#3b82f6"} className="h-10" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseGroupModal}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingGroup ? t("update") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Article Form Modal */}
      <Dialog open={showArticleForm} onOpenChange={(open) => !open && handleCloseArticleModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? t("editArticle") : t("newArticle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleArticleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
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
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCloseArticleModal}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
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
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleGroup(group.id)}>
                    {expandedGroups.has(group.id) ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: group.color || "#3b82f6" }} />
                    <span className="font-medium">{group.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({group.articles?.length || 0} {t("articles")})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setArticleGroupId(group.id);
                        setEditingArticle(null);
                        setShowArticleForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> {t("article")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingGroup(group);
                        setShowForm(true);
                      }}
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
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedGroups.has(group.id) && (
                <CardContent>
                  {/* Articles Table */}
                  {group.articles?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">{t("articleTitle")}</th>
                          <th className="text-left py-2 px-4">{t("articleCode")}</th>
                          <th className="text-left py-2 px-4">{t("unit")}</th>
                          <th className="text-right py-2 px-4">{t("price")}</th>
                          <th className="text-right py-2 px-4">{t("tax")}</th>
                          <th className="text-right py-2 px-4">{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.articles.map((article: any) => (
                          <tr key={article.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="py-2 px-4">{article.title}</td>
                            <td className="py-2 px-4">{article.code || "-"}</td>
                            <td className="py-2 px-4">{article.unite || "-"}</td>
                            <td className="py-2 px-4 text-right">{formatCurrency(article.price)}</td>
                            <td className="py-2 px-4 text-right">{article.tax || 0}%</td>
                            <td className="py-2 px-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingArticle(article);
                                    setArticleGroupId(group.id);
                                    setShowArticleForm(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
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
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
