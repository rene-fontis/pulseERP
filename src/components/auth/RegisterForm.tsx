// src/components/auth/RegisterForm.tsx
"use client";

import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile, // Import updateProfile
  type UserCredential
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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

const registerFormSchema = z.object({
  email: z.string().email({ message: "Ungültige E-Mail-Adresse." }),
  password: z.string().min(6, { message: "Passwort muss mindestens 6 Zeichen lang sein." }),
  displayName: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm() {
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
    },
  });

  const saveUserToFirestore = async (firebaseUser: UserCredential['user'], displayNameFromForm?: string | null) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef); 
    if (!userDoc.exists()) {
        const userData: NewUserPayload = {
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || displayNameFromForm || null,
            photoURL: firebaseUser.photoURL || null,
            tenantIds: [],
            createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, userData);
    } else {
      // Optionally update existing document if needed, e.g. if displayName changed
      // For now, we just ensure it exists
      const existingData = userDoc.data();
      if (displayNameFromForm && existingData.displayName !== displayNameFromForm) {
        await setDoc(userDocRef, { displayName: displayNameFromForm }, { merge: true });
      }
    }
  };

  const handleEmailRegister = async (values: RegisterFormValues) => {
    setIsLoadingEmail(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Update Firebase Auth profile display name if provided
      if (values.displayName) {
        await updateProfile(user, { displayName: values.displayName });
      }
      
      // Save/ensure user data in Firestore
      await saveUserToFirestore(user, values.displayName);

      toast({
        title: "Erfolg",
        description: "Benutzer erfolgreich mit E-Mail registriert.",
      });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      toast({
        title: "Fehler bei E-Mail Registrierung",
        description: error.message || "Benutzer konnte nicht registriert werden.",
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
      const user = result.user;
      
      // Save/ensure user data in Firestore, using displayName from Google profile
      await saveUserToFirestore(user, user.displayName); 
      
      toast({
        title: "Erfolg",
        description: "Erfolgreich mit Google angemeldet/registriert.",
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
        <form onSubmit={form.handleSubmit(handleEmailRegister)} className="space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Anzeigename (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Max Mustermann" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            Mit E-Mail registrieren
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
        Mit Google registrieren
      </Button>
    </div>
  );
}
