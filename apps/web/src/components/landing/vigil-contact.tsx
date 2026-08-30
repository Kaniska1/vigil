"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  ArrowRight,
  Mail,
  MessageSquareCode,
} from "lucide-react";

import { FaGithub } from "react-icons/fa";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ContactForm = {
  name: string;
  email: string;
  interest: string;
  message: string;
};

export function VigilContact() {
  const [form, setForm] =
    useState<ContactForm>({
      name: "",
      email: "",
      interest: "",
      message: "",
    });

  function change(
    field: keyof ContactForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    console.log(
      "Vigil contact:",
      form,
    );
  }

  return (
    <section
      id="contact"
      className="
        relative
        overflow-hidden
        border-t
        border-white/[0.05]
        bg-[#0d0e0f]
        px-6
        py-24
        md:py-32
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          bottom-[-200px]
          left-[-160px]
          size-[500px]
          rounded-full
          bg-[#ab56ff]/10
          blur-[170px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          right-[-180px]
          top-[5%]
          size-[500px]
          rounded-full
          bg-[#3879f8]/10
          blur-[170px]
        "
      />

      <div
        className="
          relative
          mx-auto
          grid
          max-w-6xl
          items-center
          gap-16
          lg:grid-cols-[0.9fr_1.1fr]
        "
      >
        {/* LEFT */}

        <div>

          <h2
            className="
              mt-6
              max-w-xl
              text-4xl
              font-extrabold
              leading-[1.06]
              tracking-[-0.05em]
              text-white
              sm:text-5xl
            "
          >
            Building something
            agent-native?

            <span
              className="
                mt-2
                block
                bg-gradient-to-r
                from-[#ab56ff]
                via-[#7e72f4]
                to-[#3879f8]
                bg-clip-text
                text-transparent
              "
            >
              Talk to us.
            </span>
          </h2>

          <p
            className="
              mt-6
              max-w-lg
              text-[15px]
              font-medium
              leading-7
              text-white/42
            "
          >
            Want to integrate a remote agent, experiment
            with the Vigil SDK, contribute to the runtime
            or discuss autonomous orchestration? Send a
            message.
          </p>

          <div
            className="
              my-8
              h-px
              w-20
              bg-gradient-to-r
              from-[#ab56ff]
              via-[#7e72f4]
              to-[#3879f8]
            "
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:kaniska.mitra@gmail.com"
              className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-white/[0.06]
                bg-[#121416]
                p-2
                transition-all
                hover:border-[#7e72f4]/20
                hover:bg-[#16181b]
              "
            >
              <div
                className="
                  flex
                  size-11
                  items-center
                  justify-center
                  rounded-lg
                  bg-[#7e72f4]/10
                "
              >
                <Mail className="size-4 text-[#aaa1ff]" />
              </div>

              <div>
                <p className="text-[11px] text-white/35">
                  Email
                </p>

                <p className="text-[12px] font-bold text-white/75">
                  kaniska.mitra@gmail.com
                </p>
              </div>
            </a>

            <a
              href="https://github.com/Kaniska1/vigil"
              target="_blank"
              rel="noreferrer"
              className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-white/[0.06]
                bg-[#121416]
                p-2
                transition-all
                hover:border-[#3879f8]/20
                hover:bg-[#16181b]
              "
            >
              <div
                className="
                  flex
                  size-11
                  items-center
                  justify-center
                  rounded-lg
                  bg-[#3879f8]/10
                "
              >
                <FaGithub className="size-4 text-[#78a3ff]" />
              </div>

              <div>
                <p className="text-[11px] text-white/35">
                  GitHub
                </p>

                <p className="text-[12px] font-bold text-white/75">
                  View project
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* FORM */}

        <Card
          className="
            rounded-[26px]
            border-white/[0.07]
            bg-[#121416]
            shadow-[0_30px_90px_rgba(0,0,0,.4)]
          "
        >
          <CardContent className="p-7 sm:p-8">
            <form
              onSubmit={submit}
              className="space-y-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">
                    Name
                  </Label>

                  <Input
                    id="contact-name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(event) =>
                      change(
                        "name",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">
                    Work email
                  </Label>

                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(event) =>
                      change(
                        "email",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest">
                  Area of interest
                </Label>

                <select
                  id="interest"
                  value={form.interest}
                  onChange={(event) =>
                    change(
                      "interest",
                      event.target.value,
                    )
                  }
                  className="
                    h-10
                    w-full
                    rounded-[11px]
                    border
                    border-[var(--line)]
                    bg-[var(--field)]
                    px-3.5
                    text-[13px]
                    font-semibold
                    text-[var(--ink)]
                    outline-none
                    transition-all
                    focus:border-[#7e72f4]
                    focus:ring-4
                    focus:ring-[#7e72f4]/10
                  "
                >
                  <option value="">
                    Select an option
                  </option>

                  <option value="sdk">
                    Vigil SDK
                  </option>

                  <option value="agents">
                    Remote agents
                  </option>

                  <option value="orchestration">
                    Agent orchestration
                  </option>

                  <option value="contributing">
                    Open-source contribution
                  </option>

                  <option value="other">
                    Something else
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">
                  Message
                </Label>

                <Textarea
                  id="message"
                  rows={5}
                  placeholder="Tell us what you're building..."
                  value={form.message}
                  onChange={(event) =>
                    change(
                      "message",
                      event.target.value,
                    )
                  }
                  className="resize-none"
                />
              </div>

              <Button
                type="submit"
                className="
                  group
                  h-11
                  w-full
                  rounded-xl
                  bg-[#7700c7]
                  font-bold
                  text-white
                  shadow-[0_12px_30px_rgba(56,121,248,.18)]
                  hover:bg-[#ac39f8]
                "
              >
                Send message

                <ArrowRight
                  className="
                    ml-1
                    size-4
                    transition-transform
                    group-hover:translate-x-1
                  "
                />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}