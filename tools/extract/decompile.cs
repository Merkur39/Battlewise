#:package ICSharpCode.Decompiler@9.1.0.7988
#:property PublishAot=false
#:property RestoreAdditionalProjectSources=https://api.nuget.org/v3/index.json

// Decompiles the installed game code into out/decompile/<name>.cs, to check the combat rules the
// extraction and the engine follow against the very version the data comes from. That is Iron Gate's
// code: git-ignored, never committed.
//
//   dotnet run decompile.cs -- assembly_valheim
//
// A name is looked up in the game's Managed folder (VALHEIM_INSTALL, else the default Steam path).

using System;
using System.IO;
using System.Runtime.CompilerServices;
using ICSharpCode.Decompiler;
using ICSharpCode.Decompiler.CSharp;
using ICSharpCode.Decompiler.Metadata;

var install = Environment.GetEnvironmentVariable("VALHEIM_INSTALL");
if (string.IsNullOrEmpty(install))
    install = @"C:\Program Files (x86)\Steam\steamapps\common\Valheim";
var managed = Path.Combine(install, "valheim_Data", "Managed");
var outDir = Path.Combine(ScriptFolder(), "out", "decompile");
Directory.CreateDirectory(outDir);

foreach (var name in args)
{
    var assembly = Path.Combine(managed, name + ".dll");
    var module = new PEFile(assembly);
    var resolver = new UniversalAssemblyResolver(assembly, false, module.Metadata.DetectTargetFrameworkId());
    resolver.AddSearchDirectory(managed);
    var decompiler = new CSharpDecompiler(assembly, resolver, new DecompilerSettings { ThrowOnAssemblyResolveErrors = false });
    var file = Path.Combine(outDir, name + ".cs");
    File.WriteAllText(file, decompiler.DecompileWholeModuleAsString());
    Console.WriteLine(file);
}

static string ScriptFolder([CallerFilePath] string path = "") => Path.GetDirectoryName(path)!;
