"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, User } from "lucide-react";
import Image from "next/image";

export default function CompanyPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const res = await fetch("/api/company");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Informations mises a jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise a jour");
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      codePostal: formData.get("codePostal"),
      city: formData.get("city"),
      bank: formData.get("bank"),
      account: formData.get("account"),
      iban: formData.get("iban"),
      address: formData.get("address"),
      logo: previewImage || company?.logo,
    };
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  const displayImage = previewImage || company?.logo;

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Informations</h1>

          <form onSubmit={handleSubmit} className="max-w-4xl">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {displayImage ? (
                  <Image
                    src={displayImage}
                    alt="Company logo"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Camera className="w-4 h-4" />
                  Ajouter une image
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom societe
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={company?.name}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={company?.email}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code Postal
                </label>
                <input
                  type="text"
                  name="codePostal"
                  defaultValue={company?.codePostal}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  name="city"
                  defaultValue={company?.city}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Banque
                </label>
                <input
                  type="text"
                  name="bank"
                  defaultValue={company?.bank}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Compte
                </label>
                <input
                  type="text"
                  name="account"
                  defaultValue={company?.account}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  name="iban"
                  defaultValue={company?.iban}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={company?.address}
                  className="w-full px-4 py-3 bg-blue-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-700"
                />
              </div>
            </div>

            <div className="flex justify-center mt-10">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-2 rounded-md"
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>

          <div className="text-center pt-8 mt-8 border-t border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
            FactureXl Copyright 2022
          </div>
        </div>
      </div>
    </div>
  );
}
