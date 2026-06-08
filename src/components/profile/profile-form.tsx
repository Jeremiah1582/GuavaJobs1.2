"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { CvPasteHelper } from "@/components/profile/cv-paste-helper"
import { ExperienceSection } from "@/components/profile/experience-section"
import { ProfilePicture } from "@/components/profile/profile-picture"
import { ProgressRing } from "@/components/profile/progress-ring"
import {
  CareerPreferencesSection,
  careerPreferencesFromProfile,
  type CareerPreferencesState,
} from "@/components/profile/career-preferences-section"
import { QuizSection } from "@/components/profile/quiz-section"
import { ProfileAtsSummary } from "@/components/profile/profile-ats-summary"
import { ProfileImportLauncher } from "@/components/profile/profile-import-launcher"
import { ProfileSection, ProfileSectionNav } from "@/components/profile/profile-section-nav"
import type { UrlImportApplyPayload } from "@/components/profile/url-import"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  updateProfileAction,
  uploadCvAction,
  type ProfileActionState,
} from "@/lib/profile/actions"
import type { ProfileDto } from "@/lib/profile"
import {
  collectStringImportConflict,
  getUserEditedFields,
  mergeUserEditedFields,
  type ImportConflict,
} from "@/lib/profile/user-field-guard"
import type {
  EducationEntry,
  ExperienceEntry,
  ProfileImportMeta,
  ProfileQuiz,
} from "@/lib/validators/profile"

type ProfileFormProps = {
  initialProfile: ProfileDto
}

function parseExperience(value: unknown): ExperienceEntry[] {
  if (!Array.isArray(value)) return []
  return value as ExperienceEntry[]
}

function parseEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) return []
  return value as EducationEntry[]
}

function parseQuiz(value: unknown): ProfileQuiz {
  if (!value || typeof value !== "object") return {}
  return value as ProfileQuiz
}

const emptyEducation = (): EducationEntry => ({
  institution: "",
})

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(
    initialProfile.displayName ?? ""
  )
  const [headline, setHeadline] = useState(initialProfile.headline ?? "")
  const [location, setLocation] = useState(initialProfile.location ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(initialProfile.websiteUrl ?? "")
  const [phone, setPhone] = useState(initialProfile.phone ?? "")
  const [addressLine1, setAddressLine1] = useState(
    initialProfile.addressLine1 ?? ""
  )
  const [addressLine2, setAddressLine2] = useState(
    initialProfile.addressLine2 ?? ""
  )
  const [city, setCity] = useState(initialProfile.city ?? "")
  const [region, setRegion] = useState(initialProfile.region ?? "")
  const [postalCode, setPostalCode] = useState(initialProfile.postalCode ?? "")
  const [country, setCountry] = useState(initialProfile.country ?? "")
  const [lastImportSourceUrl, setLastImportSourceUrl] = useState(
    initialProfile.lastImportSourceUrl ?? ""
  )
  const [importMeta, setImportMeta] = useState<ProfileImportMeta | null>(
    initialProfile.importMetaJson
  )
  const [profilePicture, setProfilePicture] = useState<string | null>(
    initialProfile.avatarUrl ?? null
  )
  const [summary, setSummary] = useState(initialProfile.summary ?? "")
  const [skillsText, setSkillsText] = useState(initialProfile.skills.join(", "))
  const [experience, setExperience] = useState<ExperienceEntry[]>(
    parseExperience(initialProfile.experienceJson)
  )
  const [education, setEducation] = useState<EducationEntry[]>(
    parseEducation(initialProfile.educationJson)
  )
  const [quiz, setQuiz] = useState<ProfileQuiz>(
    parseQuiz(initialProfile.quizJson)
  )
  const [career, setCareer] = useState<CareerPreferencesState>(
    careerPreferencesFromProfile(initialProfile)
  )
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(() =>
    getUserEditedFields(initialProfile.importMetaJson),
  )
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false)
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([])
  const pendingImportRef = useRef<UrlImportApplyPayload | null>(null)

  const importMetaForSubmit = mergeUserEditedFields(importMeta, userEditedFields)

  function markEdited(field: string) {
    setUserEditedFields((prev) => {
      if (prev.has(field)) return prev
      const next = new Set(prev)
      next.add(field)
      return next
    })
  }

  // Calculate completeness dynamically (aligned with core sections)
  const calculateCompleteness = () => {
    let filled = 0
    const total = 6
    if (summary.trim()) filled++
    if (skillsText.trim()) filled++
    if (experience.length > 0) filled++
    if (education.length > 0) filled++
    if (quiz && Object.keys(quiz).length > 0) filled++
    const hasCareer =
      career.aspiringRole.trim() ||
      career.personalityType.trim() ||
      career.rightToWork ||
      career.languages.length > 0 ||
      career.salaryMin ||
      career.salaryMax ||
      career.targetSeniority ||
      career.employmentTypePreference ||
      career.relocationWillingness
    if (hasCareer) filled++
    return Math.round((filled / total) * 100)
  }

  const completenessPercent = calculateCompleteness()

  const [saveState, saveAction, isSaving] = useActionState<
    ProfileActionState,
    FormData
  >(updateProfileAction, null)

  const [uploadState, uploadAction, isUploading] = useActionState<
    ProfileActionState,
    FormData
  >(uploadCvAction, null)

  useEffect(() => {
    if (saveState?.success) {
      toast.success("Profile saved")
      setUserEditedFields((fields) => {
        setImportMeta((prev) => mergeUserEditedFields(prev, fields))
        return fields
      })
    }
    if (saveState?.error) {
      toast.error(saveState.error)
    }
  }, [saveState])

  useEffect(() => {
    if (uploadState?.success) {
      toast.success("CV uploaded — you can populate your profile from it below")
      router.refresh()
    }
    if (uploadState?.error) {
      toast.error(uploadState.error)
    }
  }, [uploadState, router])

  function handleCvPaste(data: {
    experience: ExperienceEntry[]
    education: EducationEntry[]
    skills: string[]
  }) {
    if (data.experience.length) {
      setExperience((prev) => [...prev, ...data.experience])
    }
    if (data.education.length) {
      setEducation((prev) => [...prev, ...data.education])
    }
    if (data.skills.length) {
      setSkillsText((prev) => {
        const existing = prev
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        const merged = [...new Set([...existing, ...data.skills])]
        return merged.join(", ")
      })
    }
    toast.message("CV text applied — review entries and save.")
  }

  function applyUrlImport(data: UrlImportApplyPayload, forceOverwrite = false) {
    const conflicts: ImportConflict[] = []

    const tryString = (
      field: string,
      current: string,
      incoming: string | null | undefined,
      setter: (value: string) => void,
    ) => {
      const conflict = collectStringImportConflict(
        field,
        current,
        incoming,
        userEditedFields,
      )
      if (conflict) {
        if (forceOverwrite) setter(conflict.incoming)
        else conflicts.push(conflict)
        return
      }
      if (incoming?.trim() && !current.trim()) {
        setter(incoming.trim())
      }
    }

    tryString("displayName", displayName, data.name, setDisplayName)
    tryString("headline", headline, data.headline, setHeadline)
    tryString("location", location, data.location, setLocation)
    tryString("phone", phone, data.phone, setPhone)
    tryString("websiteUrl", websiteUrl, data.websiteUrl, setWebsiteUrl)
    tryString("addressLine1", addressLine1, data.addressLine1, setAddressLine1)
    tryString("addressLine2", addressLine2, data.addressLine2, setAddressLine2)
    tryString("city", city, data.city, setCity)
    tryString("region", region, data.region, setRegion)
    tryString("postalCode", postalCode, data.postalCode, setPostalCode)
    tryString("country", country, data.country, setCountry)
    tryString("summary", summary, data.summary, setSummary)

    if (data.avatarUrl) {
      const avatarConflict = collectStringImportConflict(
        "avatarUrl",
        profilePicture ?? "",
        data.avatarUrl,
        userEditedFields,
      )
      if (avatarConflict) {
        if (forceOverwrite) setProfilePicture(avatarConflict.incoming)
        else conflicts.push(avatarConflict)
      } else if (!profilePicture?.trim()) {
        setProfilePicture(data.avatarUrl)
      }
    }

    if (conflicts.length > 0 && !forceOverwrite) {
      pendingImportRef.current = data
      setImportConflicts(conflicts)
      setOverwriteDialogOpen(true)
      return
    }

    if (data.sourceUrl) {
      setLastImportSourceUrl(data.sourceUrl)
      setImportMeta((prev) =>
        mergeUserEditedFields(
          {
            ...prev,
            confidence: data.confidence,
            pagesScanned: data.pagesScanned,
          },
          userEditedFields,
        ),
      )
    }
    if (data.skills.length) {
      setSkillsText((prev) => {
        const existing = prev
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        const merged = [...new Set([...existing, ...data.skills])]
        return merged.join(", ")
      })
    }
    if (data.experience.length) {
      setExperience((prev) => [...prev, ...data.experience])
    }
    if (data.education.length) {
      setEducation((prev) => [...prev, ...data.education])
    }
    if (data.quiz && Object.keys(data.quiz).length > 0) {
      setQuiz((prev) => ({ ...prev, ...data.quiz }))
    }
    toast.success("Profile data imported — review and save your changes.")
  }

  function handleUrlImport(data: UrlImportApplyPayload) {
    applyUrlImport(data)
  }

  function confirmImportOverwrite() {
    const pending = pendingImportRef.current
    pendingImportRef.current = null
    setOverwriteDialogOpen(false)
    setImportConflicts([])
    if (pending) applyUrlImport(pending, true)
  }

  return (
    <div className="space-y-8">
      <ProfileImportLauncher
        cvFileUrl={initialProfile.cvFileUrl}
        onImport={handleUrlImport}
      />

      {/* Hero: avatar, core fields, ATS + profile rings */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-guava-pink-light/50 via-muted/30 to-guava-green-light/30 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <ProfilePicture
            imageUrl={profilePicture}
            onImageChange={(url) => {
              markEdited("avatarUrl")
              setProfilePicture(url)
            }}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full min-w-0 space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-guava-pink">
                  Your profile
                </p>
                <h1 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">
                  {displayName.trim() || "Add your details"}
                </h1>
                {headline.trim() ? (
                  <p className="mt-1 text-sm font-medium text-foreground/90">{headline}</p>
                ) : null}
                {location.trim() ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{location}</p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  Powers job matching and AI cover letters.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="displayName">Full name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => {
                      markEdited("displayName")
                      setDisplayName(e.target.value)
                    }}
                    placeholder="Jane Smith"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => {
                      markEdited("headline")
                      setHeadline(e.target.value)
                    }}
                    placeholder="Senior software engineer"
                    maxLength={300}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => {
                      markEdited("location")
                      setLocation(e.target.value)
                    }}
                    placeholder="London, UK"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => {
                      markEdited("websiteUrl")
                      setWebsiteUrl(e.target.value)
                    }}
                    placeholder="https://yoursite.com"
                    maxLength={2000}
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-5">
              <ProfileAtsSummary
                variant="inline"
                profileCompleteness={initialProfile.completeness.percent}
                hasCvFile={Boolean(initialProfile.cvFileUrl?.trim())}
              />
              <div className="flex flex-col items-center gap-1 text-center">
                <ProgressRing
                  percent={completenessPercent}
                  size={72}
                  strokeWidth={5}
                  className="shrink-0"
                  label="profile"
                  compact
                  showLabel={false}
                />
                <p className="text-xs font-medium text-foreground">Completion</p>
                <p className="text-[10px] text-muted-foreground">Form sections</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProfileSectionNav />

      <CvPasteHelper onApply={handleCvPaste} />

      {/* Main Form — LinkedIn-style scrollable sections, single save */}
      <form action={saveAction} className="space-y-0">
        <input
          type="hidden"
          name="experienceJson"
          value={JSON.stringify(experience)}
        />
        <input
          type="hidden"
          name="educationJson"
          value={JSON.stringify(education)}
        />
        <input type="hidden" name="quizJson" value={JSON.stringify(quiz)} />
        <input
          type="hidden"
          name="languagesJson"
          value={JSON.stringify(
            career.languages.filter((l) => l.language.trim()),
          )}
        />
        <input type="hidden" name="linkedInUrl" value={career.linkedInUrl} />
        <input type="hidden" name="githubUrl" value={career.githubUrl} />
        <input type="hidden" name="aspiringRole" value={career.aspiringRole} />
        <input
          type="hidden"
          name="personalityType"
          value={career.personalityType}
        />
        <input type="hidden" name="salaryCurrency" value={career.salaryCurrency} />
        <input type="hidden" name="salaryMin" value={career.salaryMin} />
        <input type="hidden" name="salaryMax" value={career.salaryMax} />
        <input type="hidden" name="salaryPeriod" value={career.salaryPeriod} />
        <input
          type="hidden"
          name="salaryNegotiable"
          value={career.salaryNegotiable ? "true" : "false"}
        />
        <input type="hidden" name="rightToWork" value={career.rightToWork} />
        <input type="hidden" name="rightToWorkNote" value={career.rightToWorkNote} />
        <input
          type="hidden"
          name="noticePeriodWeeks"
          value={career.noticePeriodWeeks}
        />
        <input type="hidden" name="availableFrom" value={career.availableFrom} />
        <input type="hidden" name="targetSeniority" value={career.targetSeniority} />
        <input
          type="hidden"
          name="employmentTypePreference"
          value={career.employmentTypePreference}
        />
        <input
          type="hidden"
          name="relocationWillingness"
          value={career.relocationWillingness}
        />
        <input type="hidden" name="skills" value={skillsText} />
        <input type="hidden" name="displayName" value={displayName} />
        <input type="hidden" name="headline" value={headline} />
        <input type="hidden" name="location" value={location} />
        <input type="hidden" name="websiteUrl" value={websiteUrl} />
        <input
          type="hidden"
          name="lastImportSourceUrl"
          value={lastImportSourceUrl}
        />
        <input
          type="hidden"
          name="importMetaJson"
          value={
            importMetaForSubmit ? JSON.stringify(importMetaForSubmit) : ""
          }
        />
        <input type="hidden" name="avatarUrl" value={profilePicture ?? ""} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="addressLine1" value={addressLine1} />
        <input type="hidden" name="addressLine2" value={addressLine2} />
        <input type="hidden" name="city" value={city} />
        <input type="hidden" name="region" value={region} />
        <input type="hidden" name="postalCode" value={postalCode} />
        <input type="hidden" name="country" value={country} />

        {saveState?.error ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{saveState.error}</AlertDescription>
          </Alert>
        ) : null}

        {/* About */}
        <ProfileSection id="about" title="About">
          <div className="space-y-2">
            <Label htmlFor="summary" className="sr-only">
              Professional summary
            </Label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              value={summary}
              onChange={(e) => {
                markEdited("summary")
                setSummary(e.target.value)
              }}
              maxLength={5000}
              placeholder="Write a short overview of your background and goals, like a LinkedIn About section…"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[120px] w-full rounded-lg border px-4 py-3 text-sm shadow-xs outline-none transition-all duration-300 focus-visible:ring-[3px]"
            />
          </div>
        </ProfileSection>

        {/* Contact */}
        <ProfileSection
          id="contact"
          title="Contact"
          description="Optional — used on applications and imports from your site."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  markEdited("phone")
                  setPhone(e.target.value)
                }}
                placeholder="+44 7700 900000"
                maxLength={40}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => {
                  markEdited("addressLine1")
                  setAddressLine1(e.target.value)
                }}
                placeholder="123 High Street"
                maxLength={200}
                autoComplete="address-line1"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(e) => {
                  markEdited("addressLine2")
                  setAddressLine2(e.target.value)
                }}
                placeholder="Flat 4"
                maxLength={200}
                autoComplete="address-line2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => {
                  markEdited("city")
                  setCity(e.target.value)
                }}
                placeholder="Manchester"
                maxLength={100}
                autoComplete="address-level2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">County / region</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => {
                  markEdited("region")
                  setRegion(e.target.value)
                }}
                placeholder="Greater Manchester"
                maxLength={100}
                autoComplete="address-level1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postcode</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => {
                  markEdited("postalCode")
                  setPostalCode(e.target.value)
                }}
                placeholder="M1 1AA"
                maxLength={20}
                autoComplete="postal-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => {
                  markEdited("country")
                  setCountry(e.target.value)
                }}
                placeholder="United Kingdom"
                maxLength={100}
                autoComplete="country-name"
              />
            </div>
          </div>
        </ProfileSection>

        {/* Experience */}
        <ProfileSection id="experience" title="Experience">
          <ExperienceSection
            entries={experience}
            onChange={(next) => {
              markEdited("experience")
              setExperience(next)
            }}
          />
        </ProfileSection>

        {/* Skills */}
        <ProfileSection id="skills" title="Skills">
          <div className="space-y-2">
            <Label htmlFor="skills" className="text-sm text-muted-foreground">
              Separate skills with commas
            </Label>
            <Input
              id="skills"
              value={skillsText}
              onChange={(e) => {
                markEdited("skills")
                setSkillsText(e.target.value)
              }}
              placeholder="TypeScript, React, project management..."
              className="transition-all duration-300"
            />
          </div>
        </ProfileSection>

        {/* Education */}
        <ProfileSection
          id="education"
          title="Education"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                markEdited("education")
                setEducation([...education, emptyEducation()])
              }}
            >
              <Plus className="size-4" />
              Add
            </Button>
          }
        >
          {education.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No education added yet. Click {"\"Add\""} to include your
              qualifications.
            </p>
          ) : (
            <div className="space-y-4">
              {education.map((entry, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border bg-background/50 p-4 transition-all duration-300 sm:grid-cols-2"
                >
                  <div className="flex justify-end sm:col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        markEdited("education")
                        setEducation(education.filter((_, i) => i !== index))
                      }}
                      className="size-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Institution</Label>
                    <Input
                      value={entry.institution}
                      onChange={(e) => {
                        markEdited("education")
                        const next = [...education]
                        next[index] = { ...entry, institution: e.target.value }
                        setEducation(next)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Degree</Label>
                    <Input
                      value={entry.degree ?? ""}
                      onChange={(e) => {
                        markEdited("education")
                        const next = [...education]
                        next[index] = { ...entry, degree: e.target.value }
                        setEducation(next)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dates</Label>
                    <Input
                      value={entry.endDate ?? entry.startDate ?? ""}
                      placeholder="e.g. 2018 - 2022"
                      onChange={(e) => {
                        markEdited("education")
                        const next = [...education]
                        next[index] = { ...entry, endDate: e.target.value }
                        setEducation(next)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProfileSection>

        {/* Career */}
        <ProfileSection id="career" title="Career & logistics">
          <CareerPreferencesSection
            value={career}
            onChange={(next) => {
              markEdited("career")
              setCareer(next)
            }}
          />
        </ProfileSection>

        {/* Preferences */}
        <ProfileSection id="preferences" title="Job search preferences">
          <QuizSection
            quiz={quiz}
            onChange={(next) => {
              markEdited("quiz")
              setQuiz(next)
            }}
          />
        </ProfileSection>

        {/* Save */}
        <div className="flex justify-center py-8">
          <Button
            type="submit"
            size="lg"
            className="min-w-[200px] rounded-full bg-guava-pink-gradient text-accent-foreground transition-all duration-700 hover:scale-105 hover:opacity-90"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </div>
      </form>

      {/* CV upload — outside form to avoid nesting */}
      <ProfileSection
        id="cv"
        title="CV file"
        description="Optional PDF or Word upload for ATS scanning and profile import."
        className="pb-4"
      >
        {initialProfile.cvFileUrl ? (
          <p className="text-sm text-foreground">
            Current file:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {initialProfile.cvFileUrl}
            </code>
          </p>
        ) : null}
        {uploadState?.error ? (
          <Alert variant="destructive">
            <AlertDescription>{uploadState.error}</AlertDescription>
          </Alert>
        ) : null}
        <form action={uploadAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="cvFile">Upload CV</Label>
            <input
              id="cvFile"
              name="cvFile"
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={isUploading}
            className="transition-all duration-300"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </form>
      </ProfileSection>

      <AlertDialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite your edits?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  Import found values that differ from fields you&apos;ve already
                  edited. Choose whether to replace your saved answers.
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm">
                  {importConflicts.map((conflict) => (
                    <li key={conflict.field}>
                      <span className="font-medium text-foreground">
                        {conflict.label}
                      </span>
                      <p className="text-muted-foreground">
                        Yours: {conflict.current}
                      </p>
                      <p className="text-muted-foreground">
                        Import: {conflict.incoming}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                pendingImportRef.current = null
                setImportConflicts([])
              }}
            >
              Keep my edits
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmImportOverwrite}>
              Use import values
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
