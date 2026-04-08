import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import CodeBlock from "@tiptap/extension-code-block";
import Link from "@tiptap/extension-link";
import Blockquote from "@tiptap/extension-blockquote";
import HardBreak from "@tiptap/extension-hard-break";
import "prosemirror-view/style/prosemirror.css";
import PageTitle from "../components/common/PageTitle";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";
import api from "../lib/api";
import { toast } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";
import { ROLES } from "../app/constants";
import { 
  Shield, Calendar, User, Edit2, Save, X, BookOpen, 
  Bold as BoldIcon, Italic as ItalicIcon, List, 
  ListOrdered, Heading2 as HeadingIcon, Code2 as CodeIcon,
  Info, CheckCircle2, AlertCircle
} from "lucide-react";

export default function PolicyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isHROrAdmin = user?.role === ROLES.HR || user?.role === ROLES.ADMIN;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [policy, setPolicy] = useState(null);

  const defaultPolicyContent = `...`; // Keep your existing default content

  const editEditor = useEditor({
    extensions: [
      Document, Paragraph, Text, Bold, Italic, Underline,
      Heading.configure({ levels: [2, 3] }),
      BulletList, OrderedList, ListItem, CodeBlock, Blockquote,
      Link.configure({ openOnClick: true, autolink: true }),
      HardBreak
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-slate dark:prose-invert max-w-none w-full outline-none p-6 min-h-[500px] focus:ring-0"
      }
    }
  });

  // ... (Keep your existing loadPolicy, handleSave, handleCancel logic)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Spinner className="w-10 h-10 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-indigo-400/20 blur-[120px]" />
      </div>

      <div className="container relative px-4 py-12 mx-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Top Navigation / Header */}
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                <Shield className="w-4 h-4" />
                Compliance & Governance
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Policy <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Center</span>
              </h1>
              <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
                The official source of truth for company regulations and employee conduct.
              </p>
            </div>
            
            {isHROrAdmin && (
              <div className="flex items-center gap-3">
                {editMode ? (
                  <>
                    <Button
                      onClick={handleCancel}
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 shadow-lg hover:bg-blue-700 shadow-blue-500/20"
                    >
                      {saving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Publish Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setEditMode(true)}
                    className="transition-all hover:scale-105 bg-slate-900 dark:bg-white dark:text-slate-900"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Policy
                  </Button>
                )}
              </div>
            )}
          </header>

          {/* Main Content Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            
            <Card className="relative overflow-hidden bg-white border-0 shadow-2xl dark:bg-slate-900 rounded-2xl">
              {/* Card Meta Header */}
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 text-blue-600 bg-blue-100 rounded-xl dark:bg-blue-500/10 dark:text-blue-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{policy?.title || "Corporate Handbook"}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> 
                          Updated {new Date(policy?.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor / Content Area */}
              <div className="p-2 md:p-8">
                {editMode ? (
                  <div className="overflow-hidden transition-colors border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500">
                    {/* Floating Toolbar */}
                    <div className="sticky top-0 z-10 flex flex-wrap gap-1 p-2 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-700">
                      <ToolbarButton 
                        active={editEditor?.isActive("heading")} 
                        onClick={() => editEditor?.commands.toggleHeading({ level: 2 })}
                        icon={<HeadingIcon className="w-4 h-4" />}
                      />
                      <ToolbarButton 
                        active={editEditor?.isActive("bold")} 
                        onClick={() => editEditor?.commands.toggleBold()}
                        icon={<BoldIcon className="w-4 h-4" />}
                      />
                      <ToolbarButton 
                        active={editEditor?.isActive("italic")} 
                        onClick={() => editEditor?.commands.toggleItalic()}
                        icon={<ItalicIcon className="w-4 h-4" />}
                      />
                      <div className="w-px h-6 mx-1 bg-slate-200 dark:bg-slate-700" />
                      <ToolbarButton 
                        active={editEditor?.isActive("bulletList")} 
                        onClick={() => editEditor?.commands.toggleBulletList()}
                        icon={<List className="w-4 h-4" />}
                      />
                      <ToolbarButton 
                        active={editEditor?.isActive("codeBlock")} 
                        onClick={() => editEditor?.commands.toggleCodeBlock()}
                        icon={<CodeIcon className="w-4 h-4" />}
                      />
                    </div>
                    <EditorContent editor={editEditor} />
                  </div>
                ) : (
                  <article 
                    className="prose prose-slate dark:prose-invert max-w-none prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: policy?.content || defaultPolicyContent }}
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Quick Info Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <InfoCard 
              icon={<User className="text-blue-500" />}
              title="Employee Rights"
              items={["Privacy protection", "Data access", "Fair treatment"]}
            />
            <InfoCard 
              icon={<Shield className="text-indigo-500" />}
              title="Compliance"
              items={["Annual reviews", "Training sessions", "Zero-tolerance policy"]}
            />
            <InfoCard 
              icon={<AlertCircle className="text-amber-500" />}
              title="Reporting"
              items={["Whistleblower hotline", "Direct HR reporting", "Anonymous portal"]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function ToolbarButton({ active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-lg transition-all ${
        active 
          ? "bg-blue-600 text-white shadow-sm" 
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {icon}
    </button>
  );
}

function InfoCard({ icon, title, items }) {
  return (
    <Card className="p-6 transition-all bg-white border-none shadow-sm dark:bg-slate-900 hover:shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
          {icon}
        </div>
        <h3 className="font-bold">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}