import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Calendar, Bell, Music, Users, Heart, ArrowRight,
  Clock, MapPin, CheckCircle, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';

export default function Home() {
  const [user, setUser] = useState(null);
  const today = new Date();
  const thisMonth = format(today, 'yyyy-MM');

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

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => entities.Announcement.list('-created_date', 5),
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => entities.Event.list('date', 100),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => entities.ServiceSchedule.list('date', 10),
  });

  const { data: prayerRequests = [] } = useQuery({
    queryKey: ['prayerRequests'],
    queryFn: () => entities.PrayerRequest.list('-created_date', 5),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list(),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => entities.Song.list(),
  });

  // Filter upcoming events
  const upcomingEvents = events.filter(event => {
    const eventDate = parseISO(event.date);
    return eventDate >= today;
  }).slice(0, 5);

  // This week's schedule
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const thisWeekSchedule = schedules.find(s => {
    const scheduleDate = parseISO(s.date);
    return isWithinInterval(scheduleDate, { start: weekStart, end: weekEnd });
  });

  // Pinned announcements
  const pinnedAnnouncements = announcements.filter(a => a.is_pinned);
  const recentAnnouncements = announcements.filter(a => !a.is_pinned).slice(0, 3);

  const categoryColors = {
    '일정': 'bg-blue-100 text-blue-700',
    '중요': 'bg-red-100 text-red-700',
    '찬양': 'bg-purple-100 text-purple-700',
    '팀행사': 'bg-green-100 text-green-700',
    '기타': 'bg-slate-100 text-slate-700',
  };

  const eventCategoryColors = {
    '예배': 'border-blue-400 bg-blue-50',
    '연습': 'border-green-400 bg-green-50',
    '팀행사': 'border-pink-400 bg-pink-50',
    '특별일정': 'border-orange-400 bg-orange-50',
    '휴무': 'border-slate-400 bg-slate-50',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader 
        title={`안녕하세요${user?.full_name ? `, ${user.full_name}님` : ''}!`}
        description="히엘찬양팀의 오늘 현황입니다"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="팀원" 
          value={members.length} 
          icon={Users} 
          color="indigo"
          delay={0}
        />
        <StatCard 
          title="등록된 찬양" 
          value={songs.length} 
          icon={Music} 
          color="purple"
          delay={0.1}
        />
        <StatCard 
          title="이번 달 일정" 
          value={events.filter(e => e.date?.startsWith(thisMonth)).length} 
          icon={Calendar} 
          color="blue"
          delay={0.2}
        />
        <StatCard 
          title="기도 제목" 
          value={prayerRequests.filter(p => !p.is_answered).length} 
          icon={Heart} 
          color="pink"
          delay={0.3}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* This week's service */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-white/80" />
                    <h2 className="text-lg font-semibold text-white">이번 주 예배</h2>
                  </div>
                  <Link to={createPageUrl('Schedule')}>
                    <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                      전체보기 <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <CardContent className="p-6">
                {thisWeekSchedule ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center">
                        <span className="text-xs text-indigo-600 font-medium">
                          {format(parseISO(thisWeekSchedule.date), 'EEE', { locale: ko })}
                        </span>
                        <span className="text-xl font-bold text-indigo-700">
                          {format(parseISO(thisWeekSchedule.date), 'd')}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {thisWeekSchedule.title || '주일 오후예배'}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {format(parseISO(thisWeekSchedule.date), 'yyyy년 M월 d일', { locale: ko })}
                        </p>
                      </div>
                      <Badge className={thisWeekSchedule.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {thisWeekSchedule.status === 'confirmed' ? '확정' : '조율중'}
                      </Badge>
                    </div>
                    
                    {thisWeekSchedule.assignments && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(thisWeekSchedule.assignments).map(([position, member]) => (
                          member && (
                            <div key={position} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                                {Array.isArray(member) ? member.length : (member?.[0] || '?')}
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">{position}</p>
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {Array.isArray(member) ? member.join(', ') : member}
                                </p>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500">이번 주 예배 일정이 없습니다</p>
                    <Link to={createPageUrl('Schedule')}>
                      <Button variant="outline" className="mt-4">
                        일정 등록하기
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Announcements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  공지사항
                </CardTitle>
                <Link to={createPageUrl('Announcements')}>
                  <Button variant="ghost" size="sm">
                    전체보기 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {announcementsLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 p-3">
                      <Skeleton className="w-6 h-6 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : announcements.length > 0 ? (
                  [...pinnedAnnouncements, ...recentAnnouncements].slice(0, 4).map((announcement, idx) => (
                    <Link
                      key={announcement.id}
                      to={createPageUrl(`Announcements?id=${announcement.id}`)}
                      className="block p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
                    >
                      <div className="flex items-start gap-3">
                        {announcement.is_pinned && (
                          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={categoryColors[announcement.category] || categoryColors['기타']}>
                              {announcement.category}
                            </Badge>
                            <h4 className="font-medium text-slate-800 truncate">{announcement.title}</h4>
                          </div>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                            {announcement.content}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            {format(new Date(announcement.created_date), 'M월 d일', { locale: ko })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500">등록된 공지가 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  다가오는 일정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventsLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))
                ) : upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div 
                      key={event.id}
                      className={`p-3 rounded-xl border-l-4 ${eventCategoryColors[event.category] || eventCategoryColors['기타']}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">
                            {format(parseISO(event.date), 'MMM', { locale: ko })}
                          </p>
                          <p className="text-lg font-bold text-slate-800">
                            {format(parseISO(event.date), 'd')}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{event.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {event.time && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {event.time}
                              </span>
                            )}
                            {event.location && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm">예정된 일정이 없습니다</p>
                  </div>
                )}
                <Link to={createPageUrl('Calendar')}>
                  <Button variant="outline" className="w-full mt-2">
                    달력 보기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Prayer Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5 text-pink-500" />
                  기도 제목
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prayerRequests.filter(p => !p.is_answered).slice(0, 3).map((prayer) => (
                  <div 
                    key={prayer.id}
                    className="p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100"
                  >
                    <div className="flex items-start gap-3">
                      {prayer.is_urgent && (
                        <span className="text-lg">🙏</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 line-clamp-2">{prayer.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">
                            {prayer.author_name || '익명'}
                          </span>
                          <span className="text-xs text-pink-600">
                            🙏 {prayer.prayers?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Link to={createPageUrl('Prayer')}>
                  <Button variant="outline" className="w-full mt-2 border-pink-200 text-pink-600 hover:bg-pink-50">
                    기도 제목 나누기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}