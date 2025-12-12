"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { toast as customToast } from "@/lib/toast";
import Link from "next/link";
import axios from "axios";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      customToast.error("Veuillez entrer votre email");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post("/api/auth/forgot-password", { email });

      if (response.status === 200) {
        customToast.success("Email de réinitialisation envoyé avec succès");
        customToast.info("Vérifiez votre boîte de réception");
        setEmail("");

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error sending reset email:", error);

      if (error.response?.status === 404) {
        customToast.error("Aucun compte trouvé avec cet email");
      } else {
        customToast.error("Erreur lors de l'envoi de l'email");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="w-full max-w-md">
        {/* Back to Login Link */}
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la connexion
          </Link>
        </div>

        <Card className="card-angular shadow-lg">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-primary">
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-center">
              Entrez votre email pour recevoir un lien de réinitialisation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-field-angular pl-9"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="btn-angular w-full bg-primary text-white hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Vous vous souvenez de votre mot de passe ?</p>
              <Link href="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Le lien de réinitialisation sera valide pendant 1 heure</p>
        </div>
      </div>
    </div>
  );
}
