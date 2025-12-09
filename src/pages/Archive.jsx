import React, { useState, useEffect } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Archive, Plus, Play, Pause, Search, Calendar,
  Upload, Download, Star, Edit2, Trash2, Music, Users, X, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

// 음원 카테고리별 최대 개수
const AUDIO_LIMITS = {
  '연습파일': 2,
  '예배실황': 2,
  '기타': 1
};

const categoryColors = {
  '연습파일': 'bg-green-100 text-green-700',
  '예배실황': 'bg-blue-100 text-blue-700',
  '기타': 'bg-slate-1
