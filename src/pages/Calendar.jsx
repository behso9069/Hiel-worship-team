import React, { useState } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay,
  addMonths, subMonths
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Clock, MapPin, Edit2, Trash2, X, Cake
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
  SelectValue 
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';

const CATEGORIES = ['예배', '연습', '팀행사', '특별일정', '휴무'];

const categoryColors = {
  '예배': 'bg-blue-500',
  '연습': 'bg-green-500',
  '팀행사': 'bg-pink-500',
  '특별일정': 'bg-orange-500',
  '휴무': 'bg-slate-400',
};

const categoryBgColors = {
  '예배': 'bg-blue-100 text-blue-700 border-blue-200',
  '연습': 'bg-green-100 text-green-700 border-green-200',
  '팀행사': 'bg-pink-100 text-pink-700 border-pink-200',
  '특별일정': 'bg-orange-100 text-orange-700 border-orange-200',
  '휴무': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    category: '예배',
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => entities.Event.list('date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setDeleteConfirm(null);
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      date: '',
      time: '',
      location: '',
      category: '예배',
      description: ''
    });
  };

  const openEditDialog = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      category: event.category || '예배',
      description: event.description || ''
    });
    setIsDialogOpen(true);
  };

  const openNewEventDialog = (date) => {
    setFormData(prev => ({
      ...prev,
      date: format(date, 'yyyy-MM-dd')
    }));
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr);
  };

  const getBirthdaysForDate = (date) => {
    const monthDay = format(date, 'MM-dd');
    return members.filter(m => m.birthday?.slice(5) === monthDay);
  };

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="달력"
        description="교회 행사와 팀 일정을 관리합니다"
        icon={CalendarIcon}
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            일정 추가
          </Button>
        }
      />

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-xl">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </CardTitle>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Week days header */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, idx) => (
              <div 
                key={day} 
                className={cn(
                  "py-3 text-center text-sm font-medium",
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-600'
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const dayBirthdays = getBirthdaysForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const dayOfWeek = day.getDay();

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[100px] lg:min-h-[120px] p-2 border-b border-r cursor-pointer hover:bg-slate-50 transition-colors",
                    !isCurrentMonth && 'bg-slate-50/50'
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      isToday(day) && 'bg-indigo-500 text-white',
                      !isToday(day) && dayOfWeek === 0 && 'text-red-500',
                      !isToday(day) && dayOfWeek === 6 && 'text-blue-500',
                      !isToday(day) && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-slate-700',
                      !isCurrentMonth && 'text-slate-300'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {isCurrentMonth && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openNewEventDialog(day);
                        }}
                        className="w-5 h-5 rounded-full bg-slate-100 hover:bg-indigo-100 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-3 h-3 text-slate-500" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayBirthdays.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center gap-1 text-xs text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded"
                      >
                        <Cake className="w-3 h-3" />
                        <span className="truncate">{member.name}</span>
                      </div>
                    ))}
                    {dayEvents.slice(0, 2).map(event => (
                      <div 
                        key={event.id}
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded truncate",
                          categoryColors[event.category] || 'bg-slate-400',
                          'text-white'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-slate-400 px-1.5">
                        +{dayEvents.length - 2}개 더
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Detail Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-md">
          {selectedDate && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(selectedDate, 'yyyy년 M월 d일 EEEE', { locale: ko })}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Birthdays */}
                {getBirthdaysForDate(selectedDate).map(member => (
                  <div 
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                      <Cake className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-pink-700">{member.name}님 생일 🎂</p>
                      <p className="text-sm text-pink-500">축하해주세요!</p>
                    </div>
                  </div>
                ))}

                {/* Events */}
                {getEventsForDate(selectedDate).map(event => (
                  <div 
                    key={event.id}
                    className="p-4 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge className={categoryBgColors[event.category]}>
                          {event.category}
                        </Badge>
                        <h4 className="font-semibold text-slate-800 mt-2">{event.title}</h4>
                        {event.time && (
                          <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                            <Clock className="w-4 h-4" />
                            {event.time}
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-slate-600 mt-2">{event.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedDate(null);
                            openEditDialog(event);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500"
                          onClick={() => setDeleteConfirm(event)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {getEventsForDate(selectedDate).length === 0 && getBirthdaysForDate(selectedDate).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    등록된 일정이 없습니다
                  </div>
                )}

                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setSelectedDate(null);
                    openNewEventDialog(selectedDate);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  일정 추가
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? '일정 수정' : '새 일정 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">제목 *</Label>
              <Input 
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="일정 제목"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">카테고리</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">날짜 *</Label>
                <Input 
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">시간</Label>
                <Input 
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">장소</Label>
              <Input 
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="장소"
              />
            </div>

            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea 
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="상세 설명"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {editingEvent ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConfirm?.title}"을(를) 정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}