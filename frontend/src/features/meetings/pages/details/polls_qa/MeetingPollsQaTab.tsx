import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  MessageSquare,
  Users,
  Clock,
  HelpCircle,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

interface MeetingPollsQaTabProps {
  meetingId: string;
}

interface PollVoter {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
  voters: PollVoter[];
}

interface Poll {
  id: string;
  meetingId: string;
  createdByUserId: string;
  question: string;
  type: "single" | "multiple";
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  options: PollOption[];
}

interface Answer {
  id: string;
  meetingId: string;
  questionId: string;
  answeredByUserId: string;
  answeredByUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
}

interface Question {
  id: string;
  meetingId: string;
  askedByUserId: string;
  askedByUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  answers?: Answer[];
  createdAt: string;
  updatedAt: string;
}

const MOCK_POLLS = (meetingId: string): Poll[] => [
  {
    id: "mock-poll-1",
    meetingId: meetingId,
    createdByUserId: "user-1",
    question: "Chúng ta nên chọn framework nào cho dự án mới?",
    type: "single",
    closedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    options: [
      {
        id: "opt-1",
        text: "Next.js (React)",
        voterIds: ["u1", "u2", "u3", "u4"],
        voters: [
          { id: "u1", name: "Nguyễn Văn A" },
          { id: "u2", name: "Trần Thị B" },
          { id: "u3", name: "Lê Văn C" },
          { id: "u4", name: "Phạm Văn D" },
        ],
      },
      {
        id: "opt-2",
        text: "Nuxt.js (Vue)",
        voterIds: ["u5", "u6"],
        voters: [
          { id: "u5", name: "Hoàng Văn E" },
          { id: "u6", name: "Đỗ Thị F" },
        ],
      },
      {
        id: "opt-3",
        text: "SvelteKit",
        voterIds: [],
        voters: [],
      },
    ],
  },
  {
    id: "mock-poll-2",
    meetingId: meetingId,
    createdByUserId: "user-1",
    question: "Bạn đánh giá thế nào về tiến độ hiện tại?",
    type: "multiple",
    closedAt: null,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    options: [
      {
        id: "opt-4",
        text: "Rất tốt, đúng kế hoạch",
        voterIds: ["u1", "u2"],
        voters: [
          { id: "u1", name: "Nguyễn Văn A" },
          { id: "u2", name: "Trần Thị B" },
        ],
      },
      {
        id: "opt-5",
        text: "Hơi chậm, cần đẩy nhanh",
        voterIds: ["u5"],
        voters: [{ id: "u5", name: "Hoàng Văn E" }],
      },
    ],
  },
];

const MOCK_QUESTIONS = (meetingId: string): Question[] => [
  {
    id: "mock-q-1",
    meetingId: meetingId,
    askedByUserId: "u2",
    askedByUser: {
      id: "u2",
      name: "Trần Thị B",
    },
    content: "Dự án mới này sẽ sử dụng cơ sở dữ liệu gì vậy mọi người?",
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 5400000).toISOString(),
    answers: [
      {
        id: "mock-a-1",
        meetingId: meetingId,
        questionId: "mock-q-1",
        answeredByUserId: "u1",
        answeredByUser: {
          id: "u1",
          name: "Nguyễn Văn A",
        },
        content: "Chúng ta sẽ dùng PostgreSQL kết hợp với TypeORM cho dự án này nhé.",
        createdAt: new Date(Date.now() - 4800000).toISOString(),
      },
    ],
  },
  {
    id: "mock-q-2",
    meetingId: meetingId,
    askedByUserId: "u3",
    askedByUser: {
      id: "u3",
      name: "Lê Văn C",
    },
    content: "Đã có thiết kế Figma hoàn chỉnh chưa ạ?",
    createdAt: new Date(Date.now() - 1200000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
    answers: [],
  },
];

export const MeetingPollsQaTab: React.FC<MeetingPollsQaTabProps> = ({
  meetingId,
}) => {
  const { i18n } = useTranslation();
  const isVi = i18n.language === "vi";

  const [activeSubTab, setActiveSubTab] = useState<"polls" | "qa">("polls");

  // Fetch Polls
  const { data: dbPolls = [], isLoading: isLoadingPolls } = useQuery<Poll[]>({
    queryKey: ["meeting-polls", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/polls`);
      return res.data;
    },
  });

  // Fetch Q&A
  const { data: dbQuestions = [], isLoading: isLoadingQuestions } = useQuery<
    Question[]
  >({
    queryKey: ["meeting-qa", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/qa`);
      return res.data;
    },
  });

  const polls = dbPolls && dbPolls.length > 0 ? dbPolls : MOCK_POLLS(meetingId);
  const questions = dbQuestions && dbQuestions.length > 0 ? dbQuestions : MOCK_QUESTIONS(meetingId);

  // Helpers
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomBgColor = (id?: string) => {
    if (!id) return "bg-indigo-500";
    const colors = [
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-rose-500",
      "bg-cyan-500",
      "bg-teal-500",
      "bg-emerald-500",
      "bg-blue-500",
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " - " + d.toLocaleDateString();
  };

  const getPollTotalVotes = (poll: Poll) => {
    return poll.options.reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher */}
      <div className="flex space-x-2 bg-slate-100/80 dark:bg-slate-850/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40 w-fit">
        <button
          onClick={() => setActiveSubTab("polls")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === "polls"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>{isVi ? "Biểu quyết" : "Polls"}</span>
          {(polls.length > 0) && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-full">
              {polls.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("qa")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === "qa"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{isVi ? "Hỏi đáp" : "Q&A"}</span>
          {(questions.length > 0) && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-full">
              {questions.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Areas */}
      <AnimatePresence mode="wait">
        {activeSubTab === "polls" ? (
          <motion.div
            key="polls-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {isLoadingPolls ? (
              // Shimmer Loading for Polls
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-4 sm:p-6 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 animate-pulse space-y-4"
                  >
                    <div className="h-6 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-1/4 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                    <div className="space-y-3 pt-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="space-y-2">
                          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded-full"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : polls.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
                  <BarChart2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {isVi ? "Chưa có biểu quyết nào" : "No polls found"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  {isVi
                    ? "Cuộc họp này không ghi nhận hoạt động biểu quyết nào từ các thành viên."
                    : "No polls were created or voted on during this meeting."}
                </p>
              </div>
            ) : (
              // Polls List
              polls.map((poll) => {
                const totalVotes = getPollTotalVotes(poll);
                const isClosed = !!poll.closedAt;

                return (
                  <div
                    key={poll.id}
                    className="p-4 sm:p-6 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm relative overflow-hidden"
                  >
                    {/* Header Info */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isClosed
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/30"
                          }`}
                        >
                          {isClosed
                            ? isVi
                              ? "Đã kết thúc"
                              : "Closed"
                            : isVi
                            ? "Đang diễn ra"
                            : "Ongoing"}
                        </span>
                        <span className="ml-2.5 text-xs text-slate-500 dark:text-slate-400">
                          {poll.type === "multiple"
                            ? isVi
                              ? "Chọn nhiều lựa chọn"
                              : "Multiple choice"
                            : isVi
                            ? "Chọn một lựa chọn"
                            : "Single choice"}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        <span>{formatDateTime(poll.createdAt)}</span>
                      </div>
                    </div>

                    {/* Question */}
                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-6">
                      {poll.question}
                    </h4>

                    {/* Options */}
                    <div className="space-y-5">
                      {poll.options.map((option) => {
                        const optVotes = option.voterIds?.length || 0;
                        const percentage =
                          totalVotes > 0
                            ? Math.round((optVotes / totalVotes) * 100)
                            : 0;

                        return (
                          <div key={option.id} className="space-y-2">
                            {/* Option label & vote count */}
                            <div className="flex items-center justify-between text-sm font-medium">
                              <span className="text-slate-700 dark:text-slate-300">
                                {option.text}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {optVotes} {isVi ? "lượt bình chọn" : "votes"}{" "}
                                <span className="text-indigo-600 dark:text-indigo-400 ml-1.5">
                                  ({percentage}%)
                                </span>
                              </span>
                            </div>

                            {/* Beautiful dynamic progress bar */}
                            <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 dark:from-indigo-600 dark:to-violet-600 rounded-full"
                              />
                            </div>

                            {/* Voters Avatar List */}
                            {option.voters && option.voters.length > 0 && (
                              <div className="flex items-center space-x-2 pt-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center mr-1">
                                  <Users className="w-3 h-3 mr-1" />
                                  {isVi ? "Người bình chọn:" : "Voters:"}
                                </span>
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {option.voters.map((voter) => (
                                    <div
                                      key={voter.id}
                                      className="relative group cursor-pointer"
                                    >
                                      {voter.avatarUrl ? (
                                        <img
                                          className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                                          src={voter.avatarUrl}
                                          alt={voter.name}
                                        />
                                      ) : (
                                        <div
                                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 ${getRandomBgColor(
                                            voter.id
                                          )}`}
                                        >
                                          {getInitials(voter.name)}
                                        </div>
                                      )}
                                      {/* Beautiful Simple Tooltip */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-950/90 dark:bg-slate-800/95 text-white text-[10px] rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 font-medium">
                                        {voter.name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Votes footer */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {isVi
                          ? `Tổng số lượt bình chọn: ${totalVotes}`
                          : `Total votes: ${totalVotes}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="qa-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {isLoadingQuestions ? (
              // Shimmer Loading for Q&A
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-4 sm:p-6 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 animate-pulse space-y-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        <div className="h-3 w-1/6 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                      </div>
                    </div>
                    <div className="h-5 w-5/6 bg-slate-200 dark:bg-slate-850 rounded"></div>
                  </div>
                ))}
              </div>
            ) : questions.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {isVi ? "Chưa có câu hỏi nào" : "No questions found"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  {isVi
                    ? "Không có câu hỏi hoặc thảo luận nào trong mục Hỏi đáp của cuộc họp này."
                    : "No questions or answers were recorded during the Q&A session."}
                </p>
              </div>
            ) : (
              // Questions & Answers list
              questions.map((q) => {
                const answerCount = q.answers?.length || 0;

                return (
                  <div
                    key={q.id}
                    className="p-4 sm:p-6 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-4"
                  >
                    {/* Question Author and Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {q.askedByUser?.avatarUrl ? (
                          <img
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-100 dark:ring-slate-800"
                            src={q.askedByUser.avatarUrl}
                            alt={q.askedByUser.name}
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${getRandomBgColor(
                              q.askedByUser?.id
                            )}`}
                          >
                            {getInitials(q.askedByUser?.name)}
                          </div>
                        )}
                        <div>
                          <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {q.askedByUser?.name || (isVi ? "Người dùng ẩn danh" : "Anonymous User")}
                          </h5>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDateTime(q.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Question badge or answer count */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          answerCount > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30"
                        }`}
                      >
                        {answerCount > 0
                          ? isVi
                            ? `${answerCount} Trả lời`
                            : `${answerCount} Answers`
                          : isVi
                          ? "Chưa trả lời"
                          : "Unanswered"}
                      </span>
                    </div>

                    {/* Question Content */}
                    <div className="pl-1 text-slate-700 dark:text-slate-200 text-sm font-medium bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                      <p className="whitespace-pre-line leading-relaxed">{q.content}</p>
                    </div>

                    {/* Answers Section */}
                    {q.answers && q.answers.length > 0 && (
                      <div className="pl-4 sm:pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-4 pt-2">
                        {q.answers.map((answer) => (
                          <div key={answer.id} className="space-y-1.5 relative">
                            {/* Connector indicator for visuals */}
                            <div className="absolute -left-4 sm:-left-6 top-4 w-2 sm:w-3.5 border-t border-slate-200 dark:border-slate-700" />

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {answer.answeredByUser?.avatarUrl ? (
                                  <img
                                    className="w-6 h-6 rounded-full object-cover"
                                    src={answer.answeredByUser.avatarUrl}
                                    alt={answer.answeredByUser.name}
                                  />
                                ) : (
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${getRandomBgColor(
                                      answer.answeredByUser?.id
                                    )}`}
                                  >
                                    {getInitials(answer.answeredByUser?.name)}
                                  </div>
                                )}
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {answer.answeredByUser?.name ||
                                    (isVi ? "Người dùng ẩn danh" : "Anonymous User")}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {formatDateTime(answer.createdAt)}
                              </span>
                            </div>

                            {/* Answer Text bubble */}
                            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100/20 dark:border-indigo-950/30 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {answer.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
