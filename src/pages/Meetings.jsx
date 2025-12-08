import React, { useState, useEffect } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  MessageSquare, Plus, FileText, BarChart3, Vote,
  Users, Calendar, Edit2, Trash2, Upload, Download,
  CheckCircle, Clock, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import EmptyState from '@/components/common/EmptyState';

export default function Meetings() {
  const [activeTab, setActiveTab] = useState('meetings');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('meeting');
  const [editingItem, setEditingItem] = useState(null);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [meetingForm, setMeetingForm] = useState({
    date: '',
    title: '',
    attendees: [],
    summary: '',
    decisions: [],
    file_url: ''
  });

  const [surveyForm, setSurveyForm] = useState({
    title: '',
    description: '',
    type: 'poll',
    questions: [{ id: '1', question: '', type: 'single', options: ['', ''] }],
    deadline: '',
    is_anonymous: false
  });

  const queryClient = useQueryClient();

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

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => entities.Meeting.list('-date'),
  });

  const { data: surveys = [], isLoading: surveysLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => entities.Survey.list('-created_date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list('name'),
  });

  // Meeting mutations
  const createMeetingMutation = useMutation({
    mutationFn: (data) => entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      closeDialog();
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Meeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      closeDialog();
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (id) => entities.Meeting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setDeleteConfirm(null);
    },
  });

  // Survey mutations
  const createSurveyMutation = useMutation({
    mutationFn: (data) => entities.Survey.create({ ...data, responses: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      closeDialog();
    },
  });

  const updateSurveyMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Survey.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      closeDialog();
    },
  });

  const deleteSurveyMutation = useMutation({
    mutationFn: (id) => entities.Survey.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      setDeleteConfirm(null);
      setSelectedSurvey(null);
    },
  });

  const submitResponseMutation = useMutation({
    mutationFn: async ({ survey, answers }) => {
      const responses = survey.responses || [];
      responses.push({
        user_id: user?.email,
        user_name: survey.is_anonymous ? '익명' : (user?.full_name || '익명'),
        answers,
        submitted_at: new Date().toISOString()
      });
      return entities.Survey.update(survey.id, { responses });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      setSelectedSurvey(null);
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setMeetingForm({
      date: '',
      title: '',
      attendees: [],
      summary: '',
      decisions: [],
      file_url: ''
    });
    setSurveyForm({
      title: '',
      description: '',
      type: 'poll',
      questions: [{ id: '1', question: '', type: 'single', options: ['', ''] }],
      deadline: '',
      is_anonymous: false
    });
  };

  const openMeetingDialog = (meeting = null) => {
    setDialogType('meeting');
    if (meeting) {
      setEditingItem(meeting);
      setMeetingForm({
        date: meeting.date || '',
        title: meeting.title || '',
        attendees: meeting.attendees || [],
        summary: meeting.summary || '',
        decisions: meeting.decisions || [],
        file_url: meeting.file_url || ''
      });
    }
    setIsDialogOpen(true);
  };

  const openSurveyDialog = (survey = null) => {
    setDialogType('survey');
    if (survey) {
      setEditingItem(survey);
      setSurveyForm({
        title: survey.title || '',
        description: survey.description || '',
        type: survey.type || 'poll',
        questions: survey.questions || [{ id: '1', question: '', type: 'single', options: ['', ''] }],
        deadline: survey.deadline || '',
        is_anonymous: survey.is_anonymous || false
      });
    }
    setIsDialogOpen(true);
  };

  const handleMeetingSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMeetingMutation.mutate({ id: editingItem.id, data: meetingForm });
    } else {
      createMeetingMutation.mutate(meetingForm);
    }
  };

  const handleSurveySubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateSurveyMutation.mutate({ id: editingItem.id, data: surveyForm });
    } else {
      createSurveyMutation.mutate({ ...surveyForm, status: 'active' });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    setMeetingForm(prev => ({ ...prev, file_url: result.file_url }));
    setUploading(false);
  };

  const addQuestion = () => {
    setSurveyForm(prev => ({
      ...prev,
      questions: [...prev.questions, { 
        id: Date.now().toString(), 
        question: '', 
        type: 'single', 
        options: ['', ''] 
      }]
    }));
  };

  const updateQuestion = (index, field, value) => {
    setSurveyForm(prev => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  };

  const addOption = (questionIndex) => {
    setSurveyForm(prev => {
      const questions = [...prev.questions];
      questions[questionIndex].options.push('');
      return { ...prev, questions };
    });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setSurveyForm(prev => {
      const questions = [...prev.questions];
      questions[questionIndex].options[optionIndex] = value;
      return { ...prev, questions };
    });
  };

  const hasUserResponded = (survey) => {
    return survey.responses?.some(r => r.user_id === user?.email);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="회의 / 설문"
        description="회의록과 설문조사를 관리합니다"
        icon={MessageSquare}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="meetings">회의록</TabsTrigger>
            <TabsTrigger value="surveys">설문/투표</TabsTrigger>
          </TabsList>
          
          <Button 
            onClick={() => activeTab === 'meetings' ? openMeetingDialog() : openSurveyDialog()}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'meetings' ? '회의록 추가' : '설문 만들기'}
          </Button>
        </div>

        {/* Meetings Tab */}
        <TabsContent value="meetings">
          {meetingsLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-5 w-1/2 bg-slate-200 rounded mb-3" />
                    <div className="h-4 w-full bg-slate-100 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="등록된 회의록이 없습니다"
              description="회의록을 추가해주세요"
              actionLabel="회의록 추가"
              onAction={() => openMeetingDialog()}
            />
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {meetings.map((meeting, idx) => (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="group hover:shadow-md transition-all border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-800">{meeting.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {meeting.date ? format(parseISO(meeting.date), 'yyyy년 M월 d일', { locale: ko }) : '날짜 미정'}
                                </span>
                                {meeting.attendees?.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {meeting.attendees.length}명 참석
                                  </span>
                                )}
                              </div>
                              {meeting.summary && (
                                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{meeting.summary}</p>
                              )}
                              {meeting.decisions?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {meeting.decisions.slice(0, 3).map((decision, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {decision}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {meeting.file_url && (
                              <a 
                                href={meeting.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4 text-slate-500" />
                              </a>
                            )}
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              onClick={() => openMeetingDialog(meeting)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-500"
                              onClick={() => setDeleteConfirm({ type: 'meeting', item: meeting })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Surveys Tab */}
        <TabsContent value="surveys">
          {surveysLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                    <div className="h-4 w-full bg-slate-100 rounded mb-4" />
                    <div className="h-2 w-full bg-slate-100 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : surveys.length === 0 ? (
            <EmptyState 
              icon={Vote}
              title="등록된 설문이 없습니다"
              description="설문을 만들어주세요"
              actionLabel="설문 만들기"
              onAction={() => openSurveyDialog()}
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {surveys.map((survey, idx) => {
                  const isExpired = survey.deadline && isPast(parseISO(survey.deadline));
                  const responded = hasUserResponded(survey);
                  const responseCount = survey.responses?.length || 0;

                  return (
                    <motion.div
                      key={survey.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card 
                        className={cn(
                          "group cursor-pointer hover:shadow-md transition-all border-0 shadow-sm",
                          isExpired && 'opacity-60'
                        )}
                        onClick={() => setSelectedSurvey(survey)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                survey.type === 'poll' && 'bg-blue-100 text-blue-700',
                                survey.type === 'survey' && 'bg-purple-100 text-purple-700',
                                survey.type === 'vote' && 'bg-amber-100 text-amber-700'
                              )}>
                                {survey.type === 'poll' ? '투표' : survey.type === 'survey' ? '설문' : '찬반투표'}
                              </Badge>
                              {isExpired && (
                                <Badge variant="secondary">마감</Badge>
                              )}
                              {responded && (
                                <Badge className="bg-green-100 text-green-700">참여완료</Badge>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7"
                                onClick={() => openSurveyDialog(survey)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-red-500"
                                onClick={() => setDeleteConfirm({ type: 'survey', item: survey })}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <h3 className="font-semibold text-slate-800 mb-1">{survey.title}</h3>
                          {survey.description && (
                            <p className="text-sm text-slate-500 line-clamp-1 mb-3">{survey.description}</p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {responseCount}명 참여
                            </span>
                            {survey.deadline && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(parseISO(survey.deadline), 'M/d')} 까지
                              </span>
                            )}
                          </div>

                          <Progress value={responseCount} max={members.length} className="mt-3 h-1.5" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Meeting Dialog */}
      <Dialog open={isDialogOpen && dialogType === 'meeting'} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '회의록 수정' : '새 회의록 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMeetingSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">제목 *</Label>
                <Input 
                  id="title"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="회의 제목"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">날짜 *</Label>
                <Input 
                  id="date"
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="summary">요약</Label>
              <Textarea 
                id="summary"
                value={meetingForm.summary}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="회의 요약"
                rows={4}
              />
            </div>

            <div>
              <Label>회의록 파일</Label>
              <div className="mt-2">
                <input 
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="meeting-file-upload"
                />
                <label 
                  htmlFor="meeting-file-upload"
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {uploading ? '업로드 중...' : meetingForm.file_url ? '파일 변경' : '파일 업로드'}
                  </span>
                </label>
              </div>
              {meetingForm.file_url && (
                <a 
                  href={meetingForm.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mt-2 text-sm text-indigo-600"
                >
                  <FileText className="w-4 h-4" />
                  파일 보기
                </a>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createMeetingMutation.isPending || updateMeetingMutation.isPending || uploading}
                className="bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {editingItem ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Survey Dialog */}
      <Dialog open={isDialogOpen && dialogType === 'survey'} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '설문 수정' : '새 설문 만들기'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSurveySubmit} className="space-y-4">
            <div>
              <Label htmlFor="survey-title">제목 *</Label>
              <Input 
                id="survey-title"
                value={surveyForm.title}
                onChange={(e) => setSurveyForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="설문 제목"
                required
              />
            </div>

            <div>
              <Label htmlFor="survey-type">유형</Label>
              <Select 
                value={surveyForm.type} 
                onValueChange={(v) => setSurveyForm(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poll">투표</SelectItem>
                  <SelectItem value="survey">설문</SelectItem>
                  <SelectItem value="vote">찬반투표</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="survey-desc">설명</Label>
              <Textarea 
                id="survey-desc"
                value={surveyForm.description}
                onChange={(e) => setSurveyForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="설문 설명"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="deadline">마감일</Label>
              <Input 
                id="deadline"
                type="date"
                value={surveyForm.deadline}
                onChange={(e) => setSurveyForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="anonymous">익명 투표</Label>
              <Switch 
                id="anonymous"
                checked={surveyForm.is_anonymous}
                onCheckedChange={(checked) => setSurveyForm(prev => ({ ...prev, is_anonymous: checked }))}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>질문</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-1" /> 질문 추가
                </Button>
              </div>
              
              <div className="space-y-4">
                {surveyForm.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-xl space-y-3">
                    <Input 
                      value={q.question}
                      onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                      placeholder={`질문 ${qIdx + 1}`}
                    />
                    <Select 
                      value={q.type} 
                      onValueChange={(v) => updateQuestion(qIdx, 'type', v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">단일 선택</SelectItem>
                        <SelectItem value="multiple">복수 선택</SelectItem>
                        <SelectItem value="text">텍스트</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {q.type !== 'text' && (
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <Input 
                            key={oIdx}
                            value={opt}
                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                            placeholder={`선택지 ${oIdx + 1}`}
                          />
                        ))}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => addOption(qIdx)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> 선택지 추가
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createSurveyMutation.isPending || updateSurveyMutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {editingItem ? '수정' : '만들기'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Survey Response/Results Dialog */}
      <SurveyDetailDialog 
        survey={selectedSurvey}
        user={user}
        hasResponded={selectedSurvey ? hasUserResponded(selectedSurvey) : false}
        onClose={() => setSelectedSurvey(null)}
        onSubmit={(answers) => submitResponseMutation.mutate({ survey: selectedSurvey, answers })}
        isSubmitting={submitResponseMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.type === 'meeting' ? '회의록 삭제' : '설문 삭제'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm.type === 'meeting') {
                  deleteMeetingMutation.mutate(deleteConfirm.item.id);
                } else {
                  deleteSurveyMutation.mutate(deleteConfirm.item.id);
                }
              }}
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

function SurveyDetailDialog({ survey, user, hasResponded, onClose, onSubmit, isSubmitting }) {
  const [answers, setAnswers] = useState({});

  if (!survey) return null;

  const isExpired = survey.deadline && isPast(parseISO(survey.deadline));
  const showResults = hasResponded || isExpired;

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const getOptionResults = (questionId, option) => {
    const responses = survey.responses || [];
    const count = responses.filter(r => {
      const answer = r.answers?.[questionId];
      if (Array.isArray(answer)) return answer.includes(option);
      return answer === option;
    }).length;
    return {
      count,
      percentage: responses.length > 0 ? Math.round((count / responses.length) * 100) : 0
    };
  };

  return (
    <Dialog open={!!survey} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn(
              survey.type === 'poll' && 'bg-blue-100 text-blue-700',
              survey.type === 'survey' && 'bg-purple-100 text-purple-700',
              survey.type === 'vote' && 'bg-amber-100 text-amber-700'
            )}>
              {survey.type === 'poll' ? '투표' : survey.type === 'survey' ? '설문' : '찬반투표'}
            </Badge>
            {isExpired && <Badge variant="secondary">마감</Badge>}
            <Badge variant="outline">{survey.responses?.length || 0}명 참여</Badge>
          </div>
          <DialogTitle>{survey.title}</DialogTitle>
        </DialogHeader>

        {survey.description && (
          <p className="text-slate-600 text-sm">{survey.description}</p>
        )}

        <div className="space-y-6 py-4">
          {survey.questions?.map((q, qIdx) => (
            <div key={q.id} className="space-y-3">
              <p className="font-medium text-slate-800">
                {qIdx + 1}. {q.question}
              </p>
              
              {showResults ? (
                // Show results
                <div className="space-y-2">
                  {q.options?.map((opt, oIdx) => {
                    const result = getOptionResults(q.id, opt);
                    return (
                      <div key={oIdx} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{opt}</span>
                          <span className="text-slate-500">{result.count}표 ({result.percentage}%)</span>
                        </div>
                        <Progress value={result.percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Show input form
                <div className="space-y-2">
                  {q.type === 'single' ? (
                    <RadioGroup
                      value={answers[q.id] || ''}
                      onValueChange={(value) => setAnswers(prev => ({ ...prev, [q.id]: value }))}
                    >
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`${q.id}-${oIdx}`} />
                          <Label htmlFor={`${q.id}-${oIdx}`} className="cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : q.type === 'multiple' ? (
                    q.options?.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${q.id}-${oIdx}`}
                          checked={(answers[q.id] || []).includes(opt)}
                          onCheckedChange={(checked) => {
                            setAnswers(prev => {
                              const current = prev[q.id] || [];
                              if (checked) {
                                return { ...prev, [q.id]: [...current, opt] };
                              } else {
                                return { ...prev, [q.id]: current.filter(o => o !== opt) };
                              }
                            });
                          }}
                        />
                        <Label htmlFor={`${q.id}-${oIdx}`} className="cursor-pointer">{opt}</Label>
                      </div>
                    ))
                  ) : (
                    <Textarea 
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="답변을 입력하세요"
                      rows={3}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!showResults && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              제출하기
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}