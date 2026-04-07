/* Copyright (c) 2021-2026 Richard Rodger, MIT License */


package hoover

import (
	jsonic "github.com/jsonicjs/jsonic/go"
)

const Version = "0.1.1"


// Block defines a hoover block configuration.
type Block struct {
	Start              StartSpec
	End                EndSpec
	Token              string            // Token name, default "#HV"
	EscapeChar         string
	Escape             map[string]string
	AllowUnknownEscape *bool // default true
	PreserveEscapeChar bool
	Trim               bool

	name string
	tin  jsonic.Tin
}

// EndSpec defines how a block ends.
type EndSpec struct {
	Fixed   []string // End delimiter(s)
	Consume any      // bool or []string; nil = true
}

// Options configures the Hoover plugin.
type Options struct {
	Block  map[string]*Block
	Action jsonic.AltAction
}

// parseResult is the result of parsing to a block end.
type parseResult struct {
	done bool
	val  any
	err  string
}

// HooverRuleFilter defines include/exclude lists for rule matching.
type HooverRuleFilter struct {
	Include []string
	Exclude []string
}

// HooverRuleSpec defines rule context conditions for matching.
type HooverRuleSpec struct {
	Parent  *HooverRuleFilter
	Current *HooverRuleFilter
	State   string // "" = don't check, "o"/"c"/"oc" = check; default "o"
}

// StartSpec defines how a block starts.
type StartSpec struct {
	Fixed   []string  // Start delimiter(s)
	Consume *bool     // Whether to consume the start delimiter (nil = true)
	Rule    *HooverRuleSpec // Rule context matching
}

// startResult is the result of matching a block start.
type startResult struct {
	match bool
	start string
}

func (b *Block) allowUnknown() bool {
	return b.AllowUnknownEscape == nil || *b.AllowUnknownEscape
}

// Make creates a Hoover plugin with the given options.
// Usage: j.Use(hoover.Make(hoover.Options{...}))
func Make(hopts Options) jsonic.Plugin {
	return func(j *jsonic.Jsonic, _ map[string]any) {
		var blocks []*Block
		tokenMap := map[string]jsonic.Tin{}

		for name, block := range hopts.Block {
			block.name = name
			if block.Token == "" {
				block.Token = "#HV"
			}

			tin := j.Token(block.Token)
			block.tin = tin

			if _, exists := tokenMap[block.Token]; !exists {
				localTin := tin
				j.Rule("val", func(rs *jsonic.RuleSpec) {
					rs.PrependOpen(&jsonic.AltSpec{
						S: [][]jsonic.Tin{{localTin}},
						A: hopts.Action,
					})
				})
			}
			tokenMap[block.Token] = tin

			blocks = append(blocks, block)
		}

		makeHooverMatcher := func(cfg *jsonic.LexConfig, _opts *jsonic.Options) jsonic.LexMatcher {
			return func(lex *jsonic.Lex, rule *jsonic.Rule) *jsonic.Token {
				for _, block := range blocks {
					pnt := lex.Cursor()

					// When no start delimiter is defined (rule-context-only matching),
					// defer to built-in matchers for chars they would handle:
					// strings, numbers, fixed tokens, spaces, lines, comments.
					// This emulates the TS behavior where hoover runs after those
					// matchers in priority order.
					if block.Start.Fixed == nil && pnt.SI < pnt.Len {
						c := rune(lex.Src[pnt.SI])
						if cfg.StringChars[c] || cfg.FixedTokens[string(c)] != 0 ||
							cfg.SpaceChars[c] || cfg.LineChars[c] ||
							isNumberStart(c) || isCommentStart(lex.Src, pnt.SI, cfg) {
							continue
						}
					}

					hvpnt := &jsonic.Point{
						Len: pnt.Len,
						SI:  pnt.SI,
						RI:  pnt.RI,
						CI:  pnt.CI,
					}

					sr := matchStart(lex, hvpnt, block)

					if sr.match {
						result := parseToEnd(lex, hvpnt, block, cfg)

						if result.done {
							src := lex.Src[pnt.SI:hvpnt.SI]
							tkn := lex.Token(block.Token, block.tin, result.val, src)

							pnt.SI = hvpnt.SI
							pnt.RI = hvpnt.RI
							pnt.CI = hvpnt.CI

							return tkn
						}
					}
				}
				return nil
			}
		}

		j.MergeOptions(jsonic.Options{
			Lex: &jsonic.LexOptions{
				Match: map[string]*jsonic.MatchSpec{
					"hoover": {
						Order: 1500000,
						Make:  makeHooverMatcher,
					},
				},
			},
		})
	}
}

func matchStart(
	lex *jsonic.Lex,
	hvpnt *jsonic.Point,
	block *Block,
) startResult {
	src := lex.Src
	rule := lex.Ctx.Rule

	sI := hvpnt.SI
	rI := hvpnt.RI
	cI := hvpnt.CI

	start := block.Start
	rulespec := start.Rule

	// Rule context matching
	var matchRule *bool
	setMatch := func(val bool) {
		if matchRule == nil {
			t := val
			matchRule = &t
		} else {
			t := val && *matchRule
			matchRule = &t
		}
	}

	if rulespec != nil {
		if rulespec.Parent != nil {
			if rule == nil || rule.Parent == nil {
				return startResult{match: false}
			}
			if rulespec.Parent.Include != nil {
				setMatch(containsStr(rulespec.Parent.Include, rule.Parent.Name))
			}
			if rulespec.Parent.Exclude != nil {
				setMatch(!containsStr(rulespec.Parent.Exclude, rule.Parent.Name))
			}
		}

		if rulespec.Current != nil {
			if rule == nil {
				return startResult{match: false}
			}
			if rulespec.Current.Include != nil {
				setMatch(containsStr(rulespec.Current.Include, rule.Name))
			}
			if rulespec.Current.Exclude != nil {
				setMatch(!containsStr(rulespec.Current.Exclude, rule.Name))
			}
		}
	}

	// Rule state check: default "o" (open)
	rulestate := "o"
	if rulespec != nil {
		if rulespec.State == "" {
			rulestate = ""
		} else {
			rulestate = rulespec.State
		}
	}
	if rulestate != "" {
		if rule == nil {
			return startResult{match: false}
		}
		setMatch(containsChar(rulestate, rule.State))
	}

	if matchRule != nil && !*matchRule {
		return startResult{match: false}
	}

	// Fixed delimiter matching
	matchFixed := true
	fixed := start.Fixed

	if fixed != nil {
		matchFixed = false

		for _, f := range fixed {
			if sI+len(f) <= len(src) && src[sI:sI+len(f)] == f {
				matchFixed = true

				consume := start.Consume == nil || *start.Consume
				if consume {
					endI := sI + len(f)
					for fsI := sI; fsI < endI; fsI++ {
						sI++
						cI++
						if src[fsI] == '\n' {
							rI++
							cI = 1
						}
					}
				}

				break
			}
		}
	}

	if matchFixed {
		startsrc := src[hvpnt.SI:sI]

		if block.Trim {
			startsrc = trimString(startsrc)
		}

		hvpnt.SI = sI
		hvpnt.RI = rI
		hvpnt.CI = cI

		return startResult{
			match: true,
			start: startsrc,
		}
	}

	return startResult{match: false}
}

func parseToEnd(
	lex *jsonic.Lex,
	hvpnt *jsonic.Point,
	block *Block,
	cfg *jsonic.LexConfig,
) parseResult {
	var valc []byte

	src := lex.Src

	endspec := block.End
	fixed := endspec.Fixed

	endchars := make([]byte, len(fixed))
	endseqs := make([]string, len(fixed))
	for i, end := range fixed {
		if len(end) > 0 {
			endchars[i] = end[0]
			endseqs[i] = end[1:]
		} else {
			// Empty string = EOF marker
			endchars[i] = 0
			endseqs[i] = ""
		}
	}

	escapeChar := byte(0)
	if block.EscapeChar != "" {
		escapeChar = block.EscapeChar[0]
	}

	sI := hvpnt.SI
	rI := hvpnt.RI
	cI := hvpnt.CI

	done := false
	endI := sI

	for sI <= len(src) {
		// EOF check
		if sI == len(src) {
			for i, ec := range endchars {
				if ec == 0 && endseqs[i] == "" {
					endI = sI
					done = true
					break
				}
			}
			break
		}

		c := src[sI]

		// Check for end delimiters
		endCharIndex := -1
		for i, ec := range endchars {
			if ec == c {
				endCharIndex = i
				break
			}
		}

		if endCharIndex >= 0 {
			tail := endseqs[endCharIndex]

			if tail == "" {
				// Single char end delimiter
				endI = sI + 1
				done = true
				break
			}

			if sI+1+len(tail) <= len(src) && src[sI+1:sI+1+len(tail)] == tail {
				endI = sI + 1 + len(tail)
				done = true
				break
			}
		}

		// Handle escape sequences
		if escapeChar != 0 && c == escapeChar && sI+1 < len(src) {
			nextChar := string(src[sI+1])
			if block.Escape != nil {
				if replacement, ok := block.Escape[nextChar]; ok {
					valc = append(valc, []byte(replacement)...)
					sI += 2
					cI += 2
					continue
				}
			}
			if block.allowUnknown() {
				if block.PreserveEscapeChar {
					valc = append(valc, c)
				}
				valc = append(valc, src[sI+1])
				sI += 2
				cI += 2
				continue
			}
			return parseResult{
				done: false,
				val:  "",
				err:  "invalid_escape",
			}
		}

		valc = append(valc, c)
		sI++
		cI++
		if c == '\n' {
			rI++
			cI = 1
		}
	}

	if done {
		if shouldConsumeEnd(endspec, src, sI, endI) {
			for esI := sI; esI < endI; esI++ {
				sI++
				cI++
				if src[esI] == '\n' {
					rI++
					cI = 1
				}
			}
		}

		hvpnt.SI = sI
		hvpnt.RI = rI
		hvpnt.CI = cI
	}

	val := string(valc)

	if block.Trim {
		val = trimString(val)
	}

	// Resolve defined values (e.g. "true" -> true, "null" -> nil)
	var result any = val
	if cfg != nil && cfg.ValueLex && cfg.ValueDef != nil {
		if defVal, ok := cfg.ValueDef[val]; ok {
			result = defVal
		}
	}

	return parseResult{
		done: done,
		val:  result,
	}
}

func shouldConsumeEnd(endspec EndSpec, src string, sI, endI int) bool {
	if endspec.Consume == nil {
		return true
	}

	switch v := endspec.Consume.(type) {
	case bool:
		return v
	case []string:
		endfixed := src[sI:endI]
		for _, s := range v {
			if s == endfixed {
				return true
			}
		}
		return false
	}

	return true
}

func containsStr(list []string, s string) bool {
	for _, item := range list {
		if item == s {
			return true
		}
	}
	return false
}

func containsChar(s string, sub string) bool {
	for _, c := range sub {
		for _, sc := range s {
			if c == sc {
				return true
			}
		}
	}
	return false
}

func isNumberStart(c rune) bool {
	return (c >= '0' && c <= '9') || c == '-' || c == '+'
}

func isCommentStart(src string, sI int, cfg *jsonic.LexConfig) bool {
	rest := src[sI:]
	for _, cl := range cfg.CommentLine {
		if len(rest) >= len(cl) && rest[:len(cl)] == cl {
			return true
		}
	}
	for _, cb := range cfg.CommentBlock {
		if len(rest) >= len(cb[0]) && rest[:len(cb[0])] == cb[0] {
			return true
		}
	}
	return false
}

func trimString(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\r' || s[start] == '\n') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\r' || s[end-1] == '\n') {
		end--
	}
	return s[start:end]
}
