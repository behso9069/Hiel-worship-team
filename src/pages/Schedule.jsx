import React, { useState, useEffect } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isSaturday, addMonths, subMonths, isToday, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Calendar, ChevronLeft, ChevronRight, Check, X, 
  Users, Clock, Save, Edit2, Send, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';

const POSITIONS = [
  '인도자', '여성싱어', '남성싱어', '드럼', '메인건반', '세컨건반', 
  '일렉기타', '어쿠스틱기타', '베이스기타', '엔지니어'
];

// 주차 계산 함수 - 토요일(연습)과 일요일(주일)을 같은 주차로 묶음
const getWeekNumber = (date) => {
  const d = new Date(date);
  // 토요일이면 다음날(일요일) 기준으로 주차 계산
  const targetDate = new Date(d);
  if (d.getDay() === 6) { // 토요일
    targetDate.setDate(d.getDate() + 1); // 다음날(일요일)로 이동
  }
  
  const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  
  // 해당 월의 첫 번째 일요일 찾기
  const firstSunday = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  if (dayOfWeek === 0) {
    // 1일이 일요일이면 그대로
  } else {
    firstSunday.setDate(firstDay.getDate() + (7 - dayOfWeek));
  }
  
  // 첫 번째 일요일 이전이면 1주차
  if (targetDate < firstSunday) return 1;
  
  // 첫 번째 일요일부터 몇 주차인지 계산
  const diffDays = Math.floor((targetDate - firstSunday) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + (firstDay.getDay() === 0 ? 1 : 2);
};

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');

  const queryClient = useQueryClient();
  const yearMonth = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (e) {
        console.log('Not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list('name'),
  });

  const { data: attendances = [], isLoading: attendancesLoading } = useQuery({
    queryKey: ['attendances', yearMonth],
    queryFn: () => entities.Attendance.filter({ year_month: yearMonth }),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', yearMonth],
    queryFn: async () => {
      const all = await entities.ServiceSchedule.list('date');
      return all.filter(s => s.date?.startsWith(yearMonth));
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ memberId, memberName, date, eventType, status }) => {
      const existing = attendances.find(
        a => a.member_id === memberId && a.date === date && a.event_type === eventType
      );
      if (existing) {
        return entities.Attendance.update(existing.id, { status });
      } else {
        return entities.Attendance.create({
          member_id: memberId,
          member_name: memberName,
          date,
          event_type: eventType,
          status,
          year_month: yearMonth
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', yearMonth] });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ date, assignments, status }) => {
      const existing = schedules.find(s => s.date === date);
      if (existing) {
        return entities.ServiceSchedule.update(existing.id, { assignments, status });
      } else {
        return entities.ServiceSchedule.create({
          date,
          event_type: 'sunday_worship',
          assignments,
          status
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', yearMonth] });
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get Sundays and Saturdays for the month
  const sundays = days.filter(d => isSunday(d));
  const saturdays = days.filter(d => isSaturday(d));

  const getAttendanceForMember = (memberId, date, eventType) => {
    return attendances.find(
      a => a.member_id === memberId && a.date === date && a.event_type === eventType
    );
  };

  const getScheduleForDate = (date) => {
    return schedules.find(s => s.date === date);
  };

  const getAvailableMembersForDate = (date, position) => {
    return members.filter(member => {
      const hasPosition = member.positions?.includes(position);
      const attendance = getAttendanceForMember(member.id, date, 'sunday_worship');
      const isAvailable = attendance?.status === 'available';
      return hasPosition && isAvailable;
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader 
        title="일정 조율"
        description="월별 참석 현황과 봉사자 배정을 관리합니다"
        icon={Calendar}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="attendance">참석 현황</TabsTrigger>
          <TabsTrigger value="assignment">봉사자 배정</TabsTrigger>
        </TabsList>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold text-slate-800">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          <Button variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <TabsContent value="attendance">
          <AttendanceTable 
            members={members}
            sundays={sundays}
            saturdays={saturdays}
            attendances={attendances}
            getAttendanceForMember={getAttendanceForMember}
            onUpdateAttendance={attendanceMutation.mutate}
            isLoading={attendancesLoading}
            user={user}
          />
        </TabsContent>

        <TabsContent value="assignment">
          <AssignmentView 
            sundays={sundays}
            members={members}
            schedules={schedules}
            getScheduleForDate={getScheduleForDate}
            getAvailableMembersForDate={getAvailableMembersForDate}
            onUpdateSchedule={scheduleMutation.mutate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AttendanceTable({ members, sundays, saturdays, attendances, getAttendanceForMember, onUpdateAttendance, isLoading, user }) {
  // 주일(일요일)만 표시
  const allDates = sundays.map(d => ({ date: d, type: 'sunday_worship', label: '주일' }));
  allDates.sort((a, b) => a.date - b.date);

  const handleStatusChange = (member, date, eventType, status) => {
    onUpdateAttendance({
      memberId: member.id,
      memberName: member.name,
      date: format(date, 'yyyy-MM-dd'),
      eventType,
      status
    });
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left p-4 font-medium text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[120px]">
                  팀원
                </th>
                {allDates.map(({ date, type, label }) => {
                  const weekNum = getWeekNumber(date);
                  return (
                    <th key={`${format(date, 'yyyy-MM-dd')}-${type}`} className="p-3 text-center min-w-[80px]">
                      <div className="text-[10px] font-bold text-purple-500 mb-0.5">
                        {weekNum}주차
                      </div>
                      <div className={cn(
                        "text-xs font-medium",
                        type === 'sunday_worship' ? 'text-indigo-600' : 'text-emerald-600'
                      )}>
                        {label}
                      </div>
                      <div className="text-sm font-semibold text-slate-700">
                        {format(date, 'd일')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {format(date, 'E', { locale: ko })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b hover:bg-slate-50/50">
                  <td className="p-4 sticky left-0 bg-white z-10 border-r">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {member.name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                        <p className="text-xs text-slate-400">
                          {member.positions?.slice(0, 2).join(', ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  {allDates.map(({ date, type }) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const attendance = getAttendanceForMember(member.id, dateStr, type);
                    const status = attendance?.status || 'pending';

                    return (
                      <td key={`${dateStr}-${type}`} className="p-2 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleStatusChange(member, date, type, 'available')}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                              status === 'available' 
                                ? 'bg-emerald-500 text-white shadow-md' 
                                : 'bg-slate-100 text-slate-400 hover:bg-emerald-100'
                            )}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(member, date, type, 'unavailable')}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                              status === 'unavailable' 
                                ? 'bg-red-500 text-white shadow-md' 
                                : 'bg-slate-100 text-slate-400 hover:bg-red-100'
                            )}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentView({ sundays, members, schedules, getScheduleForDate, getAvailableMembersForDate, onUpdateSchedule }) {
  const [selectedSunday, setSelectedSunday] = useState(sundays[0] ? format(sundays[0], 'yyyy-MM-dd') : null);
  const [assignments, setAssignments] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (selectedSunday) {
      const schedule = getScheduleForDate(selectedSunday);
      setAssignments(schedule?.assignments || {});
    }
  }, [selectedSunday, schedules]);

  const handleSave = (status = 'draft') => {
    onUpdateSchedule({
      date: selectedSunday,
      assignments,
      status
    });
    setIsEditing(false);
  };

  const selectedSchedule = selectedSunday ? getScheduleForDate(selectedSunday) : null;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Sunday List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">주일 예배</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sundays.map((sunday) => {
            const dateStr = format(sunday, 'yyyy-MM-dd');
            const schedule = getScheduleForDate(dateStr);
            const isSelected = selectedSunday === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedSunday(dateStr)}
                className={cn(
                  "w-full p-4 rounded-xl text-left transition-all",
                  isSelected 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                    : 'bg-slate-50 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={cn(
                      "text-xs font-bold mb-1",
                      isSelected ? 'text-white/80' : 'text-purple-500'
                    )}>
                      {getWeekNumber(sunday)}주차
                    </div>
                    <p className={cn("font-semibold", isSelected ? 'text-white' : 'text-slate-800')}>
                      {format(sunday, 'M월 d일', { locale: ko })}
                    </p>
                    <p className={cn("text-sm", isSelected ? 'text-white/70' : 'text-slate-500')}>
                      {format(sunday, 'EEEE', { locale: ko })}
                    </p>
                  </div>
                  <Badge className={cn(
                    schedule?.status === 'confirmed' 
                      ? isSelected ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                      : isSelected ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700'
                  )}>
                    {schedule?.status === 'confirmed' ? '확정' : '미확정'}
                  </Badge>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Assignment Detail */}
      <Card className="lg:col-span-2 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedSunday && format(parseISO(selectedSunday), 'M월 d일 예배', { locale: ko })}
            </CardTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    취소
                  </Button>
                  <Button onClick={() => handleSave('draft')} variant="outline">
                    <Save className="w-4 h-4 mr-1" /> 저장
                  </Button>
                  <Button 
                    onClick={() => handleSave('confirmed')}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    <Send className="w-4 h-4 mr-1" /> 확정
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit2 className="w-4 h-4 mr-1" /> 수정
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedSunday ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {POSITIONS.map((position) => {
                const availableMembers = getAvailableMembersForDate(selectedSunday, position);
                const assigned = assignments[position];

                return (
                  <div 
                    key={position}
                    className="p-4 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-700">{position}</span>
                      <Badge variant="outline" className="text-xs">
                        {availableMembers.length}명 가능
                      </Badge>
                    </div>
                    
                    {isEditing ? (
                      <Select
                        value={Array.isArray(assigned) ? assigned[0] : assigned || ''}
                        onValueChange={(value) => {
                          setAssignments(prev => ({
                            ...prev,
                            [position]: position === '보컬' ? [value] : value
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>미배정</SelectItem>
                          {availableMembers.map(member => (
                            <SelectItem key={member.id} value={member.name}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {assigned ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                              {(Array.isArray(assigned) ? assigned[0] : assigned)?.[0]}
                            </div>
                            <span className="font-medium text-slate-800">
                              {Array.isArray(assigned) ? assigned.join(', ') : assigned}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">미배정</span>
                        )}
                      </div>
                    )}

                    {availableMembers.length === 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                        <AlertCircle className="w-3 h-3" />
                        가능한 팀원 없음
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              왼쪽에서 날짜를 선택해주세요
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}