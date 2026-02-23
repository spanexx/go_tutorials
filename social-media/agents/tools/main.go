package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

type Finding struct {
	File    string   `json:"file"`
	Line    int      `json:"line"`
	Kinds   []string `json:"kinds"`
	Snippet string   `json:"snippet"`
}

type Report struct {
	TotalFindings  int                  `json:"total_findings"`
	UniqueFiles    int                  `json:"unique_files"`
	FindingsByFile map[string][]Finding `json:"findings_by_file"`
	FindingsByKind map[string]int       `json:"findings_by_kind"`
}

var patterns = []struct {
	name  string
	regex *regexp.Regexp
}{
	{"todo", regexp.MustCompile(`//\s*TODO\b`)},
	{"fixme", regexp.MustCompile(`//\s*FIXME\b`)},
	{"xxx", regexp.MustCompile(`//\s*XXX\b`)},
	{"for_now", regexp.MustCompile(`//\s*[Ff]or\s+now\b`)},
	{"in_real_impl", regexp.MustCompile(`//\s*[Ii]n\s+real\s+implementation`)},
	{"in_full_impl", regexp.MustCompile(`//\s*[Ii]n\s+full\s+implementation`)},
	{"mock", regexp.MustCompile(`//\s*[Mm]ock\b`)},
	{"stub", regexp.MustCompile(`//\s*[Ss]tub\b`)},
	{"not_implemented", regexp.MustCompile(`//\s*(?:not\s+implemented|unimplemented)`)},
	{"simulate", regexp.MustCompile(`(?i)//\s*simul\w*\b`)},
}

var tsPatterns = []struct {
	name  string
	regex *regexp.Regexp
}{
	{"throw_not_impl", regexp.MustCompile(`throw\s+new\s+Error\([^)]*not\s+implemented[^)]*\)`)},
	{"private_mock", regexp.MustCompile(`private\s+\w*[Mm]ock\w*\s*[:=]`)},
	{"mock_data_var", regexp.MustCompile(`(mockData|mockList|mockItems|mockResults)\s*[:=]`)},
}

var excludeDirs = map[string]bool{
	".git": true, "node_modules": true, "dist": true, "build": true,
	".angular": true, ".cache": true, ".ralph": true, "coverage": true,
	"playwright-report": true, "test-results": true, "docs": true,
	".next": true, ".nuxt": true,
}

var excludeFiles = map[string]bool{
	"ralph-critic.sh": true, "find-stubs.sh": true, "progress.md": true,
	"package-lock.json": true, "pnpm-lock.yaml": true, "yarn.lock": true,
}

var includeExts = map[string]bool{
	".ts": true, ".tsx": true, ".js": true, ".jsx": true, ".go": true,
	".html": true, ".scss": true, ".css": true, ".json": true,
}

var excludePathPatterns = []string{
	"docs/PLAN/",
	"/PLAN/",
	"agents/",
}

var excludeShellScripts = map[string]bool{
	"find-stubs.sh":      true,
	"BUILD.sh":           true,
	"ralph-critic.sh":    true,
	"ralph-chat.sh":      true,
	"ralph-validator.sh": true,
	"ralph-loop.sh":      true,
	"ralph.sh":           true,
	"start-both.sh":      true,
}

func isIncludedFile(path string, relPath string) bool {
	// Exclude PLAN and agents directories
	for _, pattern := range excludePathPatterns {
		if strings.Contains(relPath, pattern) {
			return false
		}
	}

	filename := filepath.Base(path)

	// Exclude specific files
	if excludeFiles[filename] {
		return false
	}

	// Exclude shell scripts that contain patterns
	if strings.HasSuffix(filename, ".sh") && excludeShellScripts[filename] {
		return false
	}

	// Exclude ALL markdown files (except in specific paths if needed)
	if strings.HasSuffix(filename, ".md") {
		return false
	}

	ext := filepath.Ext(filename)
	return includeExts[ext]
}

func shouldSkipDir(name string) bool {
	return excludeDirs[name]
}

func matchPatterns(line string, isTS bool) []string {
	var matched []string
	seen := make(map[string]bool)

	for _, p := range patterns {
		if p.regex.MatchString(line) && !seen[p.name] {
			matched = append(matched, p.name)
			seen[p.name] = true
		}
	}

	if isTS {
		for _, p := range tsPatterns {
			if p.regex.MatchString(line) && !seen[p.name] {
				matched = append(matched, p.name)
				seen[p.name] = true
			}
		}
	}

	sort.Strings(matched)
	return matched
}

func isTypeScriptFile(ext string) bool {
	return ext == ".ts" || ext == ".tsx" || ext == ".js" || ext == ".jsx"
}

func scanFile(path string, relPath string) ([]Finding, error) {
	var findings []Finding
	file, err := os.Open(path)
	if err != nil {
		return findings, nil
	}
	defer file.Close()

	isTS := isTypeScriptFile(filepath.Ext(path))
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()

		if strings.TrimSpace(line) == "" {
			continue
		}

		matched := matchPatterns(line, isTS)
		if len(matched) > 0 {
			findings = append(findings, Finding{
				File:    relPath,
				Line:    lineNum,
				Kinds:   matched,
				Snippet: strings.TrimSpace(line),
			})
		}
	}

	return findings, nil
}

func scanDirectory(workspaceRoot string) ([]Finding, error) {
	var allFindings []Finding

	err := filepath.Walk(workspaceRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() && shouldSkipDir(info.Name()) {
			return filepath.SkipDir
		}

		if !info.IsDir() {
			relPath, _ := filepath.Rel(workspaceRoot, path)
			relPath = strings.ReplaceAll(relPath, "\\", "/")

			if isIncludedFile(path, relPath) {
				findings, err := scanFile(path, relPath)
				if err == nil {
					allFindings = append(allFindings, findings...)
				}
			}
		}

		return nil
	})

	return allFindings, err
}

func deduplicateFindings(findings []Finding) []Finding {
	type key struct {
		file    string
		line    int
		snippet string
	}
	seen := make(map[key]bool)
	var deduped []Finding

	for _, f := range findings {
		k := key{f.File, f.Line, f.Snippet}
		if !seen[k] {
			seen[k] = true
			deduped = append(deduped, f)
		}
	}

	return deduped
}

func sortFindings(findings []Finding) {
	sort.Slice(findings, func(i, j int) bool {
		if findings[i].File != findings[j].File {
			return findings[i].File < findings[j].File
		}
		return findings[i].Line < findings[j].Line
	})
}

func buildReport(findings []Finding) Report {
	report := Report{
		TotalFindings:  len(findings),
		FindingsByFile: make(map[string][]Finding),
		FindingsByKind: make(map[string]int),
	}

	uniqueFiles := make(map[string]bool)

	for _, f := range findings {
		report.FindingsByFile[f.File] = append(report.FindingsByFile[f.File], f)
		uniqueFiles[f.File] = true

		for _, kind := range f.Kinds {
			report.FindingsByKind[kind]++
		}
	}

	report.UniqueFiles = len(uniqueFiles)
	return report
}

func printTextReport(findings []Finding, report Report) {
	fmt.Println("\n🔍 STUB DETECTOR REPORT")
	fmt.Println(strings.Repeat("=", 70))
	fmt.Printf("Total Findings: %d\n", report.TotalFindings)
	fmt.Printf("Files with Findings: %d\n", report.UniqueFiles)
	fmt.Println()

	if report.TotalFindings == 0 {
		fmt.Println("✅ No stubbed implementations found!")
		return
	}

	fmt.Println("📊 FINDINGS BY KIND:")
	kindKeys := make([]string, 0, len(report.FindingsByKind))
	for k := range report.FindingsByKind {
		kindKeys = append(kindKeys, k)
	}
	sort.Strings(kindKeys)
	for _, kind := range kindKeys {
		fmt.Printf("  %s: %d\n", kind, report.FindingsByKind[kind])
	}

	fmt.Println()
	fmt.Println("📁 FINDINGS BY FILE:")
	fmt.Println(strings.Repeat("-", 70))

	for _, f := range findings {
		fmt.Printf("%s:%d\n", f.File, f.Line)
		fmt.Printf("  Kinds: %s\n", strings.Join(f.Kinds, ", "))
		fmt.Printf("  Code: %s\n", f.Snippet)
		fmt.Println()
	}
}

func main() {
	workspaceRoot := flag.String("workspace", ".", "Root directory to scan")
	outputJSON := flag.Bool("json", false, "Output as JSON")
	maxItems := flag.Int("max-items", 500, "Maximum findings to report")
	flag.Parse()

	absPath, err := filepath.Abs(*workspaceRoot)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: unable to resolve path: %v\n", err)
		os.Exit(1)
	}

	if info, err := os.Stat(absPath); err != nil || !info.IsDir() {
		fmt.Fprintf(os.Stderr, "Error: workspace directory not found or not a directory: %s\n", absPath)
		os.Exit(1)
	}

	findings, err := scanDirectory(absPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error during scan: %v\n", err)
		os.Exit(1)
	}

	findings = deduplicateFindings(findings)
	sortFindings(findings)

	if len(findings) > *maxItems {
		findings = findings[:*maxItems]
	}

	report := buildReport(findings)

	if *outputJSON {
		data, _ := json.MarshalIndent(report, "", "  ")
		fmt.Println(string(data))
	} else {
		printTextReport(findings, report)
	}
}
