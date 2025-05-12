// src/components/auth/LoginForm.tsx
"use client";

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  type UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from "zod";
import { useForm } from 'react-hook-form';
import { Loader2, Chrome } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { NewUserPayload } from '@/types';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Ungültige E-Mail-Adresse." }),
  password: z.string().min(1, { message: "Passwort ist erforderlich." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const ensureUserInFirestore = async (firebaseUser: UserCredential['user']) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      const userData: NewUserPayload = {
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
        tenantIds: [],
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, userData);
    }
  };

  const handleEmailLogin = async (values: LoginFormValues) => {
    setIsLoadingEmail(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await ensureUserInFirestore(userCredential.user);
      toast({
        title: "Erfolg",
        description: "Erfolgreich angemeldet.",
      });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      toast({
        title: "Fehler bei der Anmeldung",
        description: error.message || "Anmeldung fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await ensureUserInFirestore(result.user);
      toast({
        title: "Erfolg",
        description: "Erfolgreich mit Google angemeldet.",
      });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      toast({
        title: "Fehler bei Google Anmeldung",
        description: error.message || "Anmeldung mit Google fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-Mail</FormLabel>
                <FormControl>
                  <Input placeholder="max.mustermann@example.com" {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passwort</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoadingEmail || isLoadingGoogle} className="w-full">
            {isLoadingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Anmelden
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Oder
          </span>
        </div>
      </div>

      <Button 
        variant="outline" 
        onClick={handleGoogleSignIn} 
        disabled={isLoadingEmail || isLoadingGoogle} 
        className="w-full"
      >
        {isLoadingGoogle ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Chrome className="mr-2 h-4 w-4" />
        )}
        Mit Google anmelden
      </Button>
    </div>
  );
}
